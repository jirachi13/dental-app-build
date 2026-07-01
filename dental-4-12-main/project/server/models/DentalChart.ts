import mongoose from "mongoose";
import { getModel } from "./shared/getModel";
import { softDeleteFields } from "./shared/softDelete";

const dentalChartSchema = new mongoose.Schema({
  iptr_id: { type: mongoose.Schema.Types.ObjectId, ref: "StudentIptr", required: true },
  dentist_id: { type: mongoose.Schema.Types.ObjectId, ref: "Dentist", required: true },
  date_charted: { type: Date, required: true },
  ...softDeleteFields,
});

export default getModel("DentalChart", dentalChartSchema);
