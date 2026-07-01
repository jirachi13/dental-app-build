import mongoose from "mongoose";
import { getModel } from "./shared/getModel.js";

const riskStratificationSchema = new mongoose.Schema({
  preventive_id: { type: mongoose.Schema.Types.ObjectId, ref: "PreventiveCareRecord", required: true },
  risk_level: { type: String, enum: ["High", "Medium", "Low"], required: true },
  recommendation: { type: String, default: "" },
  dmf_score: { type: Number, required: true },
  dmf_index: { type: String, enum: ["DMF", "dmf"], required: true },
  validated_by_dentist: { type: Boolean, default: false },
  validated_at: { type: Date, default: null },
});

export default getModel("RiskStratification", riskStratificationSchema);
