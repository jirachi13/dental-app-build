import "dotenv/config";
import { connectDB } from "../config/db.js";
import { School, Student, StudentIptr, DentalChart, Dentist, PreventiveCareRecord, RiskStratification } from "../models/index.js";
import mongoose from "mongoose";

const STUDENTS = [
  // Bagong Tanyag Integrated School
  { school: "Bagong Tanyag Integrated School", full_name: "Juan Morales", birthday: "2020-07-23", sex: "Male", grade_level: "Grade 1", section: "Sampaguita", risk: "Low" },
  { school: "Bagong Tanyag Integrated School", full_name: "Isabella Villanueva", birthday: "2020-08-07", sex: "Female", grade_level: "Grade 1", section: "Sampaguita", risk: "Medium" },
  { school: "Bagong Tanyag Integrated School", full_name: "Aldrin Villanueva", birthday: "2018-11-22", sex: "Male", grade_level: "Grade 3", section: "Jasmine", risk: "High" },
  { school: "Bagong Tanyag Integrated School", full_name: "Elena Morales", birthday: "2018-10-10", sex: "Female", grade_level: "Grade 3", section: "Jasmine", risk: "Low" },
  { school: "Bagong Tanyag Integrated School", full_name: "Trisha Santos", birthday: "2016-01-27", sex: "Female", grade_level: "Grade 5", section: "Rose", risk: "High" },
  { school: "Bagong Tanyag Integrated School", full_name: "Katrina Lopez", birthday: "2016-12-23", sex: "Female", grade_level: "Grade 5", section: "Rose", risk: null }, // not yet screened
  // Bagong Tanyag Elementary School Annex A
  { school: "Bagong Tanyag Elementary School Annex A", full_name: "Ana Reyes Jr.", birthday: "2019-11-11", sex: "Female", grade_level: "Grade 2", section: "Dahlia", risk: "High" },
  { school: "Bagong Tanyag Elementary School Annex A", full_name: "Patricia Garcia", birthday: "2019-01-03", sex: "Female", grade_level: "Grade 2", section: "Dahlia", risk: "Medium" },
  { school: "Bagong Tanyag Elementary School Annex A", full_name: "Nico Castillo", birthday: "2017-02-17", sex: "Male", grade_level: "Grade 4", section: "Garnet", risk: "Low" },
  { school: "Bagong Tanyag Elementary School Annex A", full_name: "Marco Navarro", birthday: "2017-07-07", sex: "Male", grade_level: "Grade 4", section: "Garnet", risk: "High" },
  { school: "Bagong Tanyag Elementary School Annex A", full_name: "Ivan Villanueva", birthday: "2015-06-24", sex: "Male", grade_level: "Grade 6", section: "Topaz", risk: null },
  { school: "Bagong Tanyag Elementary School Annex A", full_name: "Jomar Diaz", birthday: "2015-08-24", sex: "Male", grade_level: "Grade 6", section: "Topaz", risk: "Medium" },
  // South Daang Hari Elementary School Main
  { school: "South Daang Hari Elementary School Main", full_name: "Patricia Castillo", birthday: "2019-12-25", sex: "Female", grade_level: "Grade 2", section: "Yakal", risk: "Low" },
  { school: "South Daang Hari Elementary School Main", full_name: "Patricia Magno", birthday: "2019-07-26", sex: "Female", grade_level: "Grade 2", section: "Yakal", risk: "Medium" },
  { school: "South Daang Hari Elementary School Main", full_name: "Bea Castillo", birthday: "2017-01-25", sex: "Female", grade_level: "Grade 4", section: "Coral", risk: "High" },
  { school: "South Daang Hari Elementary School Main", full_name: "Alyssa Martinez", birthday: "2017-02-07", sex: "Female", grade_level: "Grade 4", section: "Coral", risk: "Low" },
  { school: "South Daang Hari Elementary School Main", full_name: "Angel Bautista", birthday: "2015-04-24", sex: "Female", grade_level: "Grade 6", section: "Sunflower", risk: null },
  { school: "South Daang Hari Elementary School Main", full_name: "Celine Morales", birthday: "2015-08-12", sex: "Female", grade_level: "Grade 6", section: "Sunflower", risk: "Medium" },
];

async function main() {
  await connectDB();

  const schools: Record<string, any> = {};
  for (const s of await School.find({})) schools[s.school_name] = s;

  const dentist = await Dentist.findOne({}).sort({ created_at: 1 });
  if (!dentist) {
    throw new Error("No Dentist record found — run `npm run seed:demo` first");
  }

  let created = 0;
  for (const s of STUDENTS) {
    const school = schools[s.school];
    if (!school) {
      console.log(`Skipping ${s.full_name}: school "${s.school}" not found — run npm run seed:demo first`);
      continue;
    }

    const existing = await Student.findOne({ full_name: s.full_name, school_id: school._id });
    if (existing) {
      console.log(`Student ${s.full_name} already exists, skipping.`);
      continue;
    }

    const student = await Student.create({
      school_id: school._id,
      full_name: s.full_name,
      birthday: new Date(s.birthday),
      sex: s.sex,
      address: `${s.school}, Taguig City`,
      grade_level: s.grade_level,
      section: s.section,
    });

    const iptr = await StudentIptr.create({ student_id: student._id, school_year: "2025-2026" });

    if (s.risk) {
      const chartDate = new Date();
      chartDate.setDate(chartDate.getDate() - Math.floor(Math.random() * 60));
      await DentalChart.create({ iptr_id: iptr._id, dentist_id: dentist._id, date_charted: chartDate });

      const preventive = await PreventiveCareRecord.create({
        iptr_id: iptr._id,
        visit_date: chartDate,
        visit_number: 1,
      });

      await RiskStratification.create({
        preventive_id: preventive._id,
        risk_level: s.risk,
        dmf_score: s.risk === "High" ? 5 : s.risk === "Medium" ? 2 : 0,
        dmf_index: "dmf",
      });
    }

    created++;
    console.log(`Created student: ${s.full_name} (${s.school}, risk: ${s.risk ?? "not screened"})`);
  }

  console.log(`Done. ${created} new students created.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
