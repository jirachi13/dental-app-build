import mongoose from "mongoose";

const toothRecordSchema = new mongoose.Schema({
  chart_id: { type: mongoose.Schema.Types.ObjectId, ref: "DentalChart", required: true },
  tooth_number: { type: Number, required: true },
  condition: { type: String, maxlength: 100, required: true },
  treatment_code: { type: String, maxlength: 50 },
});

export default mongoose.models.ToothRecord || mongoose.model("ToothRecord", toothRecordSchema);
