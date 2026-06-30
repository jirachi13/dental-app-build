import mongoose from "mongoose";
import { softDeleteFields } from "./shared/softDelete";

const studentIptrSchema = new mongoose.Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    school_year: { type: String, maxlength: 20, required: true },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

export default mongoose.models.StudentIptr || mongoose.model("StudentIptr", studentIptrSchema);
