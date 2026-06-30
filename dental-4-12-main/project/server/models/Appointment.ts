import mongoose from "mongoose";
import { softDeleteFields } from "./shared/softDelete";

const appointmentSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  dentist_id: { type: mongoose.Schema.Types.ObjectId, ref: "Dentist", required: true },
  appointment_datetime: { type: Date, required: true },
  status: { type: String, maxlength: 50, required: true },
  // Not in the original ERD — added Sprint 11, see CLAUDE.md APPOINTMENT entry.
  appointment_type: { type: String, maxlength: 50, required: true },
  requires_followup: { type: Boolean, default: false },
  parental_supervision_required: { type: Boolean, default: false },
  ...softDeleteFields,
});

export default mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);
