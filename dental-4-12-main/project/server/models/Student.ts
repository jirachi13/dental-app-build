import mongoose from "mongoose";
import { fieldEncryption } from "mongoose-field-encryption";
import { softDeleteFields } from "./shared/softDelete";
import { fieldEncryptionOptions } from "./shared/fieldEncryption";

const studentSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    full_name: { type: String, maxlength: 150, required: true },
    birthday: { type: Date, required: true },
    sex: { type: String, maxlength: 10, required: true },
    address: { type: String, maxlength: 200, required: true },
    contact_number: { type: String, maxlength: 15 },
    grade_level: { type: String, required: true },
    section: { type: String, required: true },
    // Not in the original ERD — added Sprint 14. Real DOH IPTR school
    // registration data, not UI-invented (same rationale as Sprint 11's
    // appointment_type addition).
    guardian_name: { type: String, default: "" },
    guardian_contact: { type: String, default: "" },
    philhealth_number: { type: String, default: "" },
    philhealth_status: { type: String, enum: ["None", "Principal", "Dependent"], default: "None" },
    is_4ps: { type: Boolean, default: false },
    fourps_id: { type: String, default: "" },
    consent_status: { type: String, enum: ["pending", "complete"], default: "pending" },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

studentSchema.plugin(
  fieldEncryption,
  fieldEncryptionOptions(["full_name", "address", "contact_number", "guardian_name", "guardian_contact", "philhealth_number", "fourps_id"]),
);

export default mongoose.models.Student || mongoose.model("Student", studentSchema);
