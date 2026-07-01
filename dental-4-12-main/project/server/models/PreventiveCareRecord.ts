import mongoose from "mongoose";
import { getModel } from "./shared/getModel.js";
import { softDeleteFields } from "./shared/softDelete.js";

const preventiveCareRecordSchema = new mongoose.Schema(
  {
    iptr_id: { type: mongoose.Schema.Types.ObjectId, ref: "StudentIptr", required: true },
    visit_date: { type: Date, required: true },
    visit_number: { type: Number, enum: [1, 2], required: true },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

export default getModel("PreventiveCareRecord", preventiveCareRecordSchema);
