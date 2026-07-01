import mongoose from "mongoose";
import { getModel } from "./shared/getModel.js";
import { softDeleteFields } from "./shared/softDelete.js";

const schoolSchema = new mongoose.Schema(
  {
    school_name: { type: String, required: true },
    school_type: { type: String, required: true },
    principal_name: { type: String, required: true },
    street_address: { type: String, required: true },
    barangay: { type: String, required: true },
    city: { type: String, required: true },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export default getModel("School", schoolSchema);
