import mongoose from "mongoose";
import { softDeleteFields } from "./shared/softDelete";

const preventiveCareRecordSchema = new mongoose.Schema(
  {
    iptr_id: { type: mongoose.Schema.Types.ObjectId, ref: "StudentIptr", required: true },
    visit_date: { type: Date, required: true },
    visit_number: { type: Number, enum: [1, 2], required: true },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

export default mongoose.models.PreventiveCareRecord || mongoose.model("PreventiveCareRecord", preventiveCareRecordSchema);
