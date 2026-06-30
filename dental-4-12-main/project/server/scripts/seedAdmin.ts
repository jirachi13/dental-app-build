import "dotenv/config";
import { connectDB } from "../config/db";
import { User } from "../models";
import { hashPassword } from "../utils/password";
import mongoose from "mongoose";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env");
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    console.log(`User with email ${email} already exists, skipping.`);
    await mongoose.disconnect();
    return;
  }

  const password_hash = await hashPassword(password);
  const admin = await User.create({
    role: "system_admin",
    full_name: "System Administrator",
    email: email.toLowerCase().trim(),
    password_hash,
  });

  console.log(`Created system_admin user: ${admin.email} (${admin._id})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
