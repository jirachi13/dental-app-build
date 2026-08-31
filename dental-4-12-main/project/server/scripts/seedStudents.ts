import "dotenv/config";
import "../dnsFix.js"; // this machine's Node 24 + Atlas SRV workaround
import { connectDB } from "../config/db.js";
import { splitFullName } from "./splitStudentNames.js";
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
  // Secondary — Bagong Tanyag Integrated School ONLY. It is the one school
  // with a high school section (K-G10); the other two stop at Grade 6, which
  // is why the DOH report's Grade 7-10 band hides itself for them.
  //
  // Added 2026-09-01: without these the Grade 7-10 DOH band could never be
  // rendered at all, so Sprint 41's secondary report was undemoable and its
  // age brackets unverifiable. Birthdays are chosen to land in BOTH secondary
  // brackets — Grades 7-9 fall in "10-14 yrs", Grade 10 in "15-19 yrs" — so
  // the report exercises more than one age column instead of stacking
  // everyone into one.
  //
  // dmf_index is "DMF" (uppercase) for these: secondary pupils are assessed
  // on PERMANENT dentition, and the DOH table counts DMF_total separately
  // from the primary-teeth dmf_df row. The elementary records above stay
  // lowercase "dmf".
  { school: "Bagong Tanyag Integrated School", full_name: "Miguel Bonifacio", birthday: "2014-03-14", sex: "Male", grade_level: "Grade 7", section: "Rizal", risk: "Medium", dmf_index: "DMF" },
  { school: "Bagong Tanyag Integrated School", full_name: "Sofia Delacruz", birthday: "2014-09-02", sex: "Female", grade_level: "Grade 7", section: "Rizal", risk: "Low", dmf_index: "DMF" },
  { school: "Bagong Tanyag Integrated School", full_name: "Rafael Aquino", birthday: "2013-05-30", sex: "Male", grade_level: "Grade 8", section: "Mabini", risk: "High", dmf_index: "DMF" },
  { school: "Bagong Tanyag Integrated School", full_name: "Clarisse Ocampo", birthday: "2013-11-18", sex: "Female", grade_level: "Grade 8", section: "Mabini", risk: null },
  { school: "Bagong Tanyag Integrated School", full_name: "Diego Salazar", birthday: "2012-02-09", sex: "Male", grade_level: "Grade 9", section: "Luna", risk: "Medium", dmf_index: "DMF" },
  { school: "Bagong Tanyag Integrated School", full_name: "Andrea Pascual", birthday: "2012-08-25", sex: "Female", grade_level: "Grade 9", section: "Luna", risk: "High", dmf_index: "DMF" },
  { school: "Bagong Tanyag Integrated School", full_name: "Joshua Fernandez", birthday: "2011-01-16", sex: "Male", grade_level: "Grade 10", section: "Del Pilar", risk: "Low", dmf_index: "DMF" },
  { school: "Bagong Tanyag Integrated School", full_name: "Bianca Ramirez", birthday: "2011-06-04", sex: "Female", grade_level: "Grade 10", section: "Del Pilar", risk: "Medium", dmf_index: "DMF" },
];

async function main() {
  await connectDB();

  const schools: Record<string, any> = {};
  for (const s of await School.find({})) schools[s.school_name] = s;

  const dentist = await Dentist.findOne({}).sort({ created_at: 1 });
  if (!dentist) {
    throw new Error("No Dentist record found — run `npm run seed:demo` first");
  }

  // full_name is encrypted with a RANDOM IV (Sprint 26), so a plaintext
  // equality query can never match the stored ciphertext. Fetch once and
  // dedup in JS after mongoose decrypts on read — same pattern as
  // seedRpcVisit2.ts (Sprint 12 lesson).
  const existingBySchool = new Map<string, Set<string>>();
  for (const st of await Student.find({})) {
    const key = String(st.school_id);
    const set = existingBySchool.get(key) ?? new Set<string>();
    set.add(st.full_name);
    existingBySchool.set(key, set);
  }

  let created = 0;
  for (const s of STUDENTS) {
    const school = schools[s.school];
    if (!school) {
      console.log(`Skipping ${s.full_name}: school "${s.school}" not found — run npm run seed:demo first`);
      continue;
    }

    if (existingBySchool.get(String(school._id))?.has(s.full_name)) {
      console.log(`Student ${s.full_name} already exists, skipping.`);
      continue;
    }

    // Name parts are required now; reuse the migration's splitter rather than
    // duplicating the suffix/particle rules here.
    const parts = splitFullName(s.full_name);
    const student = await Student.create({
      school_id: school._id,
      last_name: parts.last_name,
      first_name: parts.first_name,
      middle_name: parts.middle_name,
      birthday: new Date(s.birthday),
      sex: s.sex,
      // HOME address, not the school. This previously seeded the school name,
      // which made every demo record show its school in the Address field.
      address: "Barangay Tanyag, Taguig City",
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
        // Secondary rows carry "DMF" (permanent dentition); elementary rows
        // default to "dmf" as before. The DOH table counts the two on
        // separate lines, so getting this wrong puts high school pupils on
        // the primary-teeth row.
        dmf_index: (s as { dmf_index?: string }).dmf_index ?? "dmf",
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
