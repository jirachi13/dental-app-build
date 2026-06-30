import { Router } from "express";
import { getHealth } from "../controllers/healthController";
import { createCrudRouter } from "./crudFactory";
import authRoutes from "./authRoutes";
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
