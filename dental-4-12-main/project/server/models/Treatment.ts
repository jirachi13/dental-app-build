import mongoose from "mongoose";
import { softDeleteFields } from "./shared/softDelete";

const treatmentSchema = new mongoose.Schema(
  {
    iptr_id: { type: mongoose.Schema.Types.ObjectId, ref: "StudentIptr", required: true },
    dentist_id: { type: mongoose.Schema.Types.ObjectId, ref: "Dentist", required: true },
    diagnosis: { type: String, required: true },
    treatment_done: { type: String, required: true },
    remarks: { type: String, default: "" },
    date: { type: Date, required: true },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

export default mongoose.models.Treatment || mongoose.model("Treatment", treatmentSchema);
