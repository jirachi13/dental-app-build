import mongoose from "mongoose";
import { getModel } from "./shared/getModel.js";
import { softDeleteFields } from "./shared/softDelete.js";

const dietarySocialHabitsSchema = new mongoose.Schema(
  {
    iptr_id: { type: mongoose.Schema.Types.ObjectId, ref: "StudentIptr", required: true },
    sugar_beverages: { type: Boolean, default: false },
    alcohol_drinker: { type: Boolean, default: false },
    tobacco_user: { type: Boolean, default: false },
    betel_nut_chewer: { type: Boolean, default: false },
    body_piercing: { type: Boolean, default: false },
    nail_biting: { type: Boolean, default: false },
    thumb_sucking: { type: Boolean, default: false },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

export default getModel("DietarySocialHabits", dietarySocialHabitsSchema);
