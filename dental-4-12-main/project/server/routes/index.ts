import { Router } from "express";
import { getHealth } from "../controllers/healthController.js";
import { createUser } from "../controllers/userController.js";
import { createCrudRouter } from "./crudFactory.js";
import authRoutes from "./authRoutes.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ADMIN_ONLY, CLINICAL_WRITE_ROLES } from "../middleware/roleGroups.js";
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

// Non-clinical / org-management models — System Admin manages accounts,
// schools, and staff records; everyone authenticated can still read them
// (needed for school-name resolution, dentist pickers, etc.).
router.use("/schools", createCrudRouter(School, { writeRoles: ADMIN_ONLY }));
// Intercepts POST /users before the generic CRUD router so passwords are
// always hashed server-side — the generic router would store a plaintext
// "password" field as-is, and password_hash is stripped from its bodies.
router.post("/users", requireAuth, requireRole(...ADMIN_ONLY), asyncHandler(createUser));
router.use("/users", createCrudRouter(User, { readRoles: ADMIN_ONLY, writeRoles: ADMIN_ONLY }));
router.use("/dentists", createCrudRouter(Dentist, { writeRoles: ADMIN_ONLY }));
router.use("/dental-aides", createCrudRouter(DentalAide, { writeRoles: ADMIN_ONLY }));

// Clinical models — all 5 roles can read (school_admin/bho_staff need this
// for dashboards/reports per CLAUDE.md's own role descriptions), but only
// clinical staff (+ System Admin as super user) can create/edit. Archive/
// restore/view-archived stays System Admin only everywhere (crudFactory's
// default), matching CLAUDE.md's SOFT DELETE RULES exactly.
router.use("/students", createCrudRouter(Student, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/student-iptrs", createCrudRouter(StudentIptr, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/medical-histories", createCrudRouter(MedicalHistory, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/dietary-social-habits", createCrudRouter(DietarySocialHabits, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/oral-health-conditions", createCrudRouter(OralHealthCondition, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/dental-charts", createCrudRouter(DentalChart, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/tooth-records", createCrudRouter(ToothRecord, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/treatments", createCrudRouter(Treatment, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/preventive-care-records", createCrudRouter(PreventiveCareRecord, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/risk-stratifications", createCrudRouter(RiskStratification, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/appointments", createCrudRouter(Appointment, { writeRoles: CLINICAL_WRITE_ROLES }));
router.use("/dentist-rotations", createCrudRouter(DentistRotation, { writeRoles: CLINICAL_WRITE_ROLES }));

// Audit trail — System Admin only, both to read and (already, since Sprint 6)
// impossible to write directly; entries are created internally via logAudit().
router.use("/audit-trails", createCrudRouter(AuditTrail, { readOnly: true, readRoles: ADMIN_ONLY }));

export default router;
