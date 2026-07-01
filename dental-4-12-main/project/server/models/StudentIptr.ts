import mongoose from "mongoose";
import { getModel } from "./shared/getModel.js";
import { softDeleteFields } from "./shared/softDelete.js";

const studentIptrSchema = new mongoose.Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    school_year: { type: String, maxlength: 20, required: true },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

export default getModel("StudentIptr", studentIptrSchema);
