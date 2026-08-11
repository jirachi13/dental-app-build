import mongoose from "mongoose";
import { getModel } from "./shared/getModel.js";
import { softDeleteFields } from "./shared/softDelete.js";

const toothRecordSchema = new mongoose.Schema({
  chart_id: { type: mongoose.Schema.Types.ObjectId, ref: "DentalChart", required: true },
  tooth_number: { type: Number, required: true },
  condition: { type: String, maxlength: 100, required: true },
  treatment_code: { type: String, maxlength: 50 },
  // Sprint J: a mis-charted tooth needs a retraction path. Without these the
  // only remedy was overwriting in place, which loses the original values.
  ...softDeleteFields,
});

export default getModel("ToothRecord", toothRecordSchema);
