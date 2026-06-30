import "dotenv/config";
import { connectDB } from "../config/db";
import { School, User, Dentist, DentalAide } from "../models";
import { hashPassword } from "../utils/password";
import mongoose from "mongoose";

const SCHOOLS = [
  {
    school_name: "Bagong Tanyag Integrated School",
    school_type: "Integrated (K-Grade 10)",
    principal_name: "TBD",
    street_address: "Bagong Tanyag",
    barangay: "Tanyag",
    city: "Taguig",
  },
  {
    school_name: "Bagong Tanyag Elementary School Annex A",
    school_type: "Elementary (K-Grade 6)",
    principal_name: "TBD",
    street_address: "Bagong Tanyag",
    barangay: "Tanyag",
    city: "Taguig",
  },
  {
    school_name: "South Daang Hari Elementary School Main",
    school_type: "Elementary (K-Grade 6)",
    principal_name: "TBD",
    street_address: "South Daang Hari",
    barangay: "Tanyag",
    city: "Taguig",
  },
];

async function ensureSchools() {
  const byName: Record<string, any> = {};
  for (const s of SCHOOLS) {
    let school = await School.findOne({ school_name: s.school_name });
    if (!school) {
      school = await School.create(s);
      console.log(`Created school: ${school.school_name}`);
    }
    byName[s.school_name] = school;
  }
  return byName;
}

async function ensureUser(email: string, role: string, full_name: string, password_hash: string, school_id: any) {
  let user = await User.findOne({ email });
  if (user) {
    console.log(`User ${email} already exists, skipping.`);
    return user;
  }
  user = await User.create({ email, role, full_name, password_hash, school_id });
  console.log(`Created ${role} user: ${email}`);
  return user;
}

async function main() {
  await connectDB();

  const schools = await ensureSchools();
  const integrated = schools["Bagong Tanyag Integrated School"];
  const annexA = schools["Bagong Tanyag Elementary School Annex A"];

  const dentistUser = await ensureUser(
    "dentist@floral.com",
    "dentist",
    "Dr. Maria Santos",
    await hashPassword("Dentist@1234"),
    integrated._id,
  );
  let dentist = await Dentist.findOne({ user_id: dentistUser._id });
  if (!dentist) {
    dentist = await Dentist.create({
      school_id: integrated._id,
      user_id: dentistUser._id,
      last_name: "Santos",
      first_name: "Maria",
      license_number: "DEMO-0001",
    });
    console.log("Created Dentist record for dentist@floral.com");
  }

  const aideUser = await ensureUser(
    "aide@floral.com",
    "dental_aide",
    "Ana Reyes",
    await hashPassword("Aide@1234"),
    integrated._id,
  );
  const existingAide = await DentalAide.findOne({ user_id: aideUser._id });
  if (!existingAide) {
    await DentalAide.create({
      school_id: integrated._id,
      user_id: aideUser._id,
      dentist_id: dentist._id,
      last_name: "Reyes",
      first_name: "Ana",
      contact_number: "09171234567",
    });
    console.log("Created DentalAide record for aide@floral.com");
  }

  await ensureUser("schooladmin@floral.com", "school_admin", "Nurse Rosa Cruz", await hashPassword("SchoolAdmin@1234"), annexA._id);
  await ensureUser("bho@floral.com", "bho_staff", "Jose Santos", await hashPassword("Bho@1234"), null);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
