import mongoose from "mongoose";
import { getModel } from "./shared/getModel";

const auditTrailSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, maxlength: 100, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  affected_record_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  affected_model: { type: String, maxlength: 50, required: true },
});

export default getModel("AuditTrail", auditTrailSchema);
