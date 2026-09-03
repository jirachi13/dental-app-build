import mongoose from "mongoose";
import { getModel } from "./shared/getModel.js";
import { softDeleteFields } from "./shared/softDelete.js";

const dentalChartSchema = new mongoose.Schema({
  iptr_id: { type: mongoose.Schema.Types.ObjectId, ref: "StudentIptr", required: true },
  dentist_id: { type: mongoose.Schema.Types.ObjectId, ref: "Dentist", required: true },
  date_charted: { type: Date, required: true },
  ...softDeleteFields,
});

// Sprint 91. `filterable: ["iptr_id"]`, and the join Sprints 88 and 90 walk:
// student -> IPTR -> charts -> tooth records.
dentalChartSchema.index({ isArchived: 1, iptr_id: 1 });

export default getModel("DentalChart", dentalChartSchema);
