// Must precede any driver import: Node 24 on one dev machine fails the Atlas
// SRV lookup without it (querySrv ECONNREFUSED).
import "../dnsFix.js";
import "dotenv/config";
import { connectDB } from "../config/db.js";
import {
  School, User, Dentist, DentalAide, Student, StudentIptr, MedicalHistory,
  DietarySocialHabits, OralHealthCondition, DentalChart, ToothRecord, Treatment,
  PreventiveCareRecord, RiskStratification, Appointment, DentistRotation, AuditTrail,
} from "../models/index.js";
import mongoose from "mongoose";

/**
 * Purges the seeded DEMO dataset so it can be reseeded clean, or replaced by
 * real hand-encoded records.
 *
 * HARD DELETE, deliberately. The app must never hard delete (CLAUDE.md); this is
 * maintenance tooling run from a developer machine and never ships to a clinic
 * user. Soft-deleting instead would leave every demo record visible to the
 * System Admin's restore screen forever.
 *
 * SAFETY, in order of importance:
 *  - The system-admin account (SEED_ADMIN_EMAIL) is NEVER deleted. Removing it
 *    would lock the operator out of the deployed app.
 *  - Students are matched against the exact name list seedStudents.ts creates.
 *    A student encoded by hand is not on that list and is therefore untouchable
 *    by this script, even if it is run by accident against real data.
 *  - Everything else is deleted by FOREIGN KEY from those students / demo users,
 *    never by a blanket query.
 *  - Dry run by default. Pass --confirm to delete.
 *
 * full_name is encrypted with a random IV, so a plaintext equality query can
 * never match; students are fetched and filtered in JS after mongoose decrypts
 * on read (same lesson as seedStudents.ts / seedRpcVisit2.ts).
 */
const CONFIRM = process.argv.includes("--confirm");

const DEMO_STUDENT_NAMES = new Set([
  "Juan Morales", "Isabella Villanueva", "Aldrin Villanueva", "Elena Morales",
  "Trisha Santos", "Katrina Lopez", "Ana Reyes Jr.", "Patricia Garcia",
  "Nico Castillo", "Marco Navarro", "Ivan Villanueva", "Jomar Diaz",
  "Patricia Castillo", "Patricia Magno", "Bea Castillo", "Alyssa Martinez",
  "Angel Bautista", "Celine Morales",
]);

const DEMO_USER_EMAILS = [
  "dentist@floral.com", "aide@floral.com", "schooladmin@floral.com", "bho@floral.com",
];

const DEMO_SCHOOLS = [
  "Bagong Tanyag Integrated School",
  "Bagong Tanyag Elementary School Annex A",
  "South Daang Hari Elementary School Main",
];

async function main() {
  await connectDB();
  console.log(`db: ${mongoose.connection.name}`);
  console.log(CONFIRM ? "MODE: DELETING\n" : "MODE: dry run (pass --confirm to delete)\n");

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase().trim();
  if (!adminEmail) {
    console.error("SEED_ADMIN_EMAIL is not set — refusing to run without knowing which account to protect.");
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`Protected admin account: ${adminEmail}\n`);

  // --- students, by exact seeded name -------------------------------------
  const allStudents = await (Student as any).find({});
  const demoStudents = allStudents.filter((s: any) => DEMO_STUDENT_NAMES.has(s.full_name));
  const foreign = allStudents.length - demoStudents.length;
  const studentIds = demoStudents.map((s: any) => s._id);

  const iptrs = await (StudentIptr as any).find({ student_id: { $in: studentIds } }).lean();
  const iptrIds = iptrs.map((i: any) => i._id);
  const charts = await (DentalChart as any).find({ iptr_id: { $in: iptrIds } }).lean();
  const chartIds = charts.map((c: any) => c._id);
  const preventives = await (PreventiveCareRecord as any).find({ iptr_id: { $in: iptrIds } }).lean();
  const preventiveIds = preventives.map((p: any) => p._id);

  const plan: [string, any, Record<string, unknown>][] = [
    ["ToothRecord",         ToothRecord,         { chart_id: { $in: chartIds } }],
    ["DentalChart",         DentalChart,         { iptr_id: { $in: iptrIds } }],
    ["RiskStratification",  RiskStratification,  { preventive_id: { $in: preventiveIds } }],
    ["PreventiveCareRecord", PreventiveCareRecord, { iptr_id: { $in: iptrIds } }],
    ["MedicalHistory",      MedicalHistory,      { iptr_id: { $in: iptrIds } }],
    ["DietarySocialHabits", DietarySocialHabits, { iptr_id: { $in: iptrIds } }],
    ["OralHealthCondition", OralHealthCondition, { iptr_id: { $in: iptrIds } }],
    ["Treatment",           Treatment,           { iptr_id: { $in: iptrIds } }],
    ["Appointment",         Appointment,         { student_id: { $in: studentIds } }],
    ["StudentIptr",         StudentIptr,         { _id: { $in: iptrIds } }],
    ["Student",             Student,             { _id: { $in: studentIds } }],
  ];

  console.log(`Students: ${demoStudents.length} demo, ${foreign} NOT on the seed list (left alone)\n`);
  for (const [name, model, filter] of plan) {
    const n = await model.countDocuments(filter);
    console.log(`  ${CONFIRM ? "delete" : "would delete"} ${String(n).padStart(4)}  ${name}`);
    if (CONFIRM && n > 0) await model.deleteMany(filter);
  }

  // --- demo staff accounts (never the admin) ------------------------------
  const demoUsers = await (User as any).find({ email: { $in: DEMO_USER_EMAILS.filter((e) => e !== adminEmail) } });
  const demoUserIds = demoUsers.map((u: any) => u._id);
  const staffPlan: [string, any, Record<string, unknown>][] = [
    ["Dentist",          Dentist,          { user_id: { $in: demoUserIds } }],
    ["DentalAide",       DentalAide,       { user_id: { $in: demoUserIds } }],
    ["DentistRotation",  DentistRotation,  {}],
    ["AuditTrail",       AuditTrail,       {}],
    ["User (demo staff)", User,            { _id: { $in: demoUserIds } }],
    ["School",           School,           { school_name: { $in: DEMO_SCHOOLS } }],
  ];
  console.log("");
  for (const [name, model, filter] of staffPlan) {
    const n = await model.countDocuments(filter);
    console.log(`  ${CONFIRM ? "delete" : "would delete"} ${String(n).padStart(4)}  ${name}`);
    if (CONFIRM && n > 0) await model.deleteMany(filter);
  }

  const adminStillThere = await (User as any).countDocuments({ email: adminEmail });
  console.log(`\nAdmin account intact: ${adminStillThere === 1 ? "YES" : "NO — STOP, INVESTIGATE"}`);
  console.log(CONFIRM ? "\nPurged. Reseed with: seed:demo → seed:students → seed:rpc-visit2 → seed:iptr-details" : "\nDry run only. Nothing was deleted.");
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
