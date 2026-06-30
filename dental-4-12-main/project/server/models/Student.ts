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
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

studentSchema.plugin(fieldEncryption, fieldEncryptionOptions(["full_name", "address", "contact_number"]));

export default mongoose.models.Student || mongoose.model("Student", studentSchema);
