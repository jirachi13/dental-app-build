import { Router } from "express";
import { getHealth } from "../controllers/healthController";
import { createUser } from "../controllers/userController";
import { createCrudRouter } from "./crudFactory";
import authRoutes from "./authRoutes";
import { asyncHandler } from "../utils/asyncHandler";
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
} from "../models";

const router = Router();

router.get("/health", getHealth);
router.use("/auth", authRoutes);

router.use("/schools", createCrudRouter(School));
// Intercepts POST /users before the generic CRUD router so passwords are
// always hashed server-side — the generic router would store a plaintext
// "password" field as-is, and password_hash is stripped from its bodies.
router.post("/users", asyncHandler(createUser));
router.use("/users", createCrudRouter(User));
router.use("/dentists", createCrudRouter(Dentist));
router.use("/dental-aides", createCrudRouter(DentalAide));
router.use("/students", createCrudRouter(Student));
router.use("/student-iptrs", createCrudRouter(StudentIptr));
router.use("/medical-histories", createCrudRouter(MedicalHistory));
router.use("/dietary-social-habits", createCrudRouter(DietarySocialHabits));
router.use("/oral-health-conditions", createCrudRouter(OralHealthCondition));
router.use("/dental-charts", createCrudRouter(DentalChart));
router.use("/tooth-records", createCrudRouter(ToothRecord));
router.use("/treatments", createCrudRouter(Treatment));
router.use("/preventive-care-records", createCrudRouter(PreventiveCareRecord));
router.use("/risk-stratifications", createCrudRouter(RiskStratification));
router.use("/appointments", createCrudRouter(Appointment));
router.use("/audit-trails", createCrudRouter(AuditTrail, { readOnly: true }));

export default router;
