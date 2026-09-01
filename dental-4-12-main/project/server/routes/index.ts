import { Router } from "express";
import { getHealth } from "../controllers/healthController.js";
import { createUser, resetPassword, sendResetLink, initiateTwofa, confirmTwofa, disableTwofa } from "../controllers/userController.js";
import { createCrudRouter } from "./crudFactory.js";
import authRoutes from "./authRoutes.js";
import predictionRoutes from "./predictionRoutes.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ADMIN_ONLY, CLINICAL_WRITE_ROLES } from "../middleware/roleGroups.js";
import { findDuplicateStudents } from "../utils/studentDuplicates.js";
import {
  School,
  User,
  Dentist,
  DentalAide,
  Student,
  StudentIptr,
  MedicalHistory,
  DietarySocialHabits,
  OralHealthCondition,
  DentalChart,
  ToothRecord,
  Treatment,
  PreventiveCareRecord,
  RiskStratification,
  Appointment,
  AuditTrail,
  DentistRotation,
} from "../models/index.js";

const router = Router();

router.get("/health", getHealth);
router.use("/auth", authRoutes);
// Predictive analytics (Sprint 21e) — proxies to the Python ML service;
// dentist + system_admin only, every assessment audit-logged.
router.use("/predictions", predictionRoutes);

// Non-clinical / org-management models — System Admin manages accounts,
// schools, and staff records; everyone authenticated can still read them
// (needed for school-name resolution, dentist pickers, etc.).
router.use("/schools", createCrudRouter(School, { writeRoles: ADMIN_ONLY }));
// Intercepts POST /users before the generic CRUD router so passwords are
// always hashed server-side — the generic router would store a plaintext
// "password" field as-is, and password_hash is stripped from its bodies.
router.post("/users", requireAuth, requireRole(...ADMIN_ONLY), asyncHandler(createUser));
// Also intercepted before the generic CRUD router -- password_hash is a
// PROTECTED_FIELD there (can't be set via the generic update), and this
// needs bcrypt hashing the generic router doesn't do.
router.patch("/users/:id/reset-password", requireAuth, requireRole(...ADMIN_ONLY), asyncHandler(resetPassword));
router.patch("/users/:id/send-reset", requireAuth, requireRole(...ADMIN_ONLY), asyncHandler(sendResetLink));
// 2FA management (admin-only, intercepted like reset-password — the twofa
// fields are PROTECTED_FIELDS in the generic router). Enable is
// confirmation-gated: initiate emails a code, confirm proves the mailbox.
router.post("/users/:id/twofa/initiate", requireAuth, requireRole(...ADMIN_ONLY), asyncHandler(initiateTwofa));
router.post("/users/:id/twofa/confirm", requireAuth, requireRole(...ADMIN_ONLY), asyncHandler(confirmTwofa));
router.post("/users/:id/twofa/disable", requireAuth, requireRole(...ADMIN_ONLY), asyncHandler(disableTwofa));
router.use("/users", createCrudRouter(User, { readRoles: ADMIN_ONLY, writeRoles: ADMIN_ONLY }));
router.use("/dentists", createCrudRouter(Dentist, { writeRoles: ADMIN_ONLY }));
router.use("/dental-aides", createCrudRouter(DentalAide, { writeRoles: ADMIN_ONLY }));

// Lightweight aggregate for the sidebar risk badge (Sprint 23p) — replicates
// useStudents' risk join server-side (student → iptrs → preventive → risk
// stratification, first hit wins) so the badge count always matches the
// dashboard, without the client re-fetching 6 collections on every page.
// Read-only; requireAuth matches the underlying models' read policy.
router.get("/stats/high-risk-count", requireAuth, asyncHandler(async (req, res) => {
  const schoolName = typeof req.query.school === "string" ? req.query.school : null;
  let studentFilter: Record<string, unknown> = { isArchived: false };
  if (schoolName) {
    const school = await School.findOne({ school_name: schoolName, isArchived: false }).select("_id").lean<{ _id: unknown } | null>();
    if (!school) { res.json({ count: 0 }); return; }
    studentFilter = { ...studentFilter, school_id: school._id };
  }
  const [students, iptrs, preventives, risks] = await Promise.all([
    Student.find(studentFilter).select("_id").lean(),
    StudentIptr.find({ isArchived: false }).select("_id student_id").lean(),
    PreventiveCareRecord.find({ isArchived: false }).select("_id iptr_id").lean(),
    RiskStratification.find({ isArchived: false }).select("preventive_id risk_level").lean(),
  ]);
  const preventiveIptrById = new Map(preventives.map((p) => [String(p._id), String(p.iptr_id)]));
  const riskByIptr = new Map<string, string>();
  for (const r of risks) {
    const iptrId = preventiveIptrById.get(String(r.preventive_id));
    if (iptrId) riskByIptr.set(iptrId, String(r.risk_level));
  }
  const iptrsByStudent = new Map<string, string[]>();
  for (const i of iptrs) {
    const list = iptrsByStudent.get(String(i.student_id)) ?? [];
    list.push(String(i._id));
    iptrsByStudent.set(String(i.student_id), list);
  }
  let count = 0;
  for (const s of students) {
    const level = (iptrsByStudent.get(String(s._id)) ?? [])
      .map((id) => riskByIptr.get(id))
      .find(Boolean);
    if (level === "High") count++;
  }
  res.json({ count });
}));

// Clinical models — all 5 roles can read (school_admin/bho_staff need this
// for dashboards/reports per CLAUDE.md's own role descriptions), but only
// clinical staff (+ System Admin as super user) can create/edit. Archive/
// restore/view-archived stays System Admin only everywhere (crudFactory's
// default), matching CLAUDE.md's SOFT DELETE RULES exactly.
// duplicateCheck: the same child gets encoded twice often enough to matter —
// once by OCR off the paper IPTR and once by hand. It warns rather than
// blocks (a 409 carrying the matches), so the person encoding decides whether
// it is really the same child; two children genuinely sharing a name and a
// birthday in one school is rare but possible. Sitting on the route means the
// add form, bulk import, OCR and offline replay are all covered by one rule.
router.use("/students", createCrudRouter(Student, { writeRoles: CLINICAL_WRITE_ROLES, duplicateCheck: findDuplicateStudents }));
// archiveRoles: the chart's "Edit Years → remove year" button is shown to the
// dentist, but archive defaulted to System Admin only, so every click 403'd and
// an accidentally added school year could not be removed. Restore stays admin
// only (restoreRoles default), per the soft-delete rule in CLAUDE.md.
router.use("/student-iptrs", createCrudRouter(StudentIptr, { writeRoles: CLINICAL_WRITE_ROLES, archiveRoles: ["system_admin", "dentist"], uniqueBy: ["student_id", "school_year"], filterable: ["student_id"] }));
router.use("/medical-histories", createCrudRouter(MedicalHistory, { writeRoles: CLINICAL_WRITE_ROLES, filterable: ["iptr_id"] }));
router.use("/dietary-social-habits", createCrudRouter(DietarySocialHabits, { writeRoles: CLINICAL_WRITE_ROLES, filterable: ["iptr_id"] }));
router.use("/oral-health-conditions", createCrudRouter(OralHealthCondition, { writeRoles: CLINICAL_WRITE_ROLES, filterable: ["iptr_id"] }));
router.use("/dental-charts", createCrudRouter(DentalChart, { writeRoles: CLINICAL_WRITE_ROLES, filterable: ["iptr_id"] }));
router.use("/tooth-records", createCrudRouter(ToothRecord, { writeRoles: CLINICAL_WRITE_ROLES, filterable: ["chart_id"] }));
router.use("/treatments", createCrudRouter(Treatment, { writeRoles: CLINICAL_WRITE_ROLES, filterable: ["iptr_id"] }));
router.use("/preventive-care-records", createCrudRouter(PreventiveCareRecord, { writeRoles: CLINICAL_WRITE_ROLES, filterable: ["iptr_id"] }));
// The audit action records whether the dentist accepted the AI suggestion
// as-is or changed it (Chapter 4 evidence for the dentist-validates-model
// gate). `model_risk_level` / `recommendation_edited` ride in the request
// body for this comparison only — the schema is strict, so they never persist.
router.use("/risk-stratifications", createCrudRouter(RiskStratification, {
  writeRoles: CLINICAL_WRITE_ROLES,
  auditCreateAction: (body) => {
    if (typeof body.model_risk_level !== "string") return undefined;
    const accepted = body.model_risk_level === body.risk_level;
    const recEdited = body.recommendation_edited === true ? "; recommendation edited" : "";
    return accepted
      ? `Created RiskStratification (dentist validated: accepted AI suggestion ${body.risk_level}${recEdited})`
      : `Created RiskStratification (dentist validated: changed AI suggestion ${body.model_risk_level} → ${body.risk_level}${recEdited})`;
  },
}));
router.use("/appointments", createCrudRouter(Appointment, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/dentist-rotations", createCrudRouter(DentistRotation, { writeRoles: CLINICAL_WRITE_ROLES }));

// Audit trail — System Admin only, both to read and (already, since Sprint 6)
// impossible to write directly; entries are created internally via logAudit().
router.use("/audit-trails", createCrudRouter(AuditTrail, { readOnly: true, readRoles: ADMIN_ONLY }));

export default router;
