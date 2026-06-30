import mongoose from "mongoose";
import { softDeleteFields } from "./shared/softDelete";

const dentalAideSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dentist_id: { type: mongoose.Schema.Types.ObjectId, ref: "Dentist", required: true },
    last_name: { type: String, required: true },
    first_name: { type: String, required: true },
    contact_number: { type: String, maxlength: 20, required: true },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export default mongoose.models.DentalAide || mongoose.model("DentalAide", dentalAideSchema);
