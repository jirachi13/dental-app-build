import "dotenv/config";
import "../dnsFix.js"; // this machine's Node 24 + Atlas SRV workaround
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { EJSON } from "bson";
import { connectDB } from "../config/db.js";

// Raw snapshot of EVERY collection, exactly as stored in Atlas — uses the
// native driver (mongoose.connection.db), so NO schema hooks run: encrypted
// fields are dumped as their stored `<iv>:<ciphertext>` strings, ObjectIds/
// Dates preserved via EJSON. This is the free-tier (M0) substitute for an
// Atlas snapshot before running migrations like reencryptFieldIVs.ts.
//
// Output: backups/backup-<timestamp>/<collection>.json  (gitignored — PII).
// Restore (worst case): for each file, EJSON.parse and insertMany back into
// the (emptied) collection with the native driver.
//
// Run: npx tsx server/scripts/backupRaw.ts

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle after connect");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve("backups", `backup-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const collections = await db.listCollections().toArray();
  let total = 0;
  for (const { name } of collections) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(outDir, `${name}.json`), EJSON.stringify(docs, undefined, 0, { relaxed: false }));
    console.log(`${name}: ${docs.length} document(s)`);
    total += docs.length;
  }
  console.log(`\nBackup complete: ${total} document(s) across ${collections.length} collection(s)`);
  console.log(`→ ${outDir}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch { /* already down */ }
  process.exit(1);
});
