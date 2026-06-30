import mongoose from "mongoose";
import { softDeleteFields } from "./shared/softDelete";

export const ROLES = ["system_admin", "dentist", "dental_aide", "school_admin", "bho_staff"] as const;

const userSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    role: { type: String, enum: ROLES, required: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true, select: false },
    is_enrolled: { type: Boolean, default: false },
    last_login: { type: Date, default: null },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export default mongoose.models.User || mongoose.model("User", userSchema);
