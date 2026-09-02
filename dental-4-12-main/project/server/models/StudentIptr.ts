import mongoose from "mongoose";
import { getModel } from "./shared/getModel.js";
import { softDeleteFields } from "./shared/softDelete.js";

const studentIptrSchema = new mongoose.Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    school_year: { type: String, maxlength: 20, required: true },
    // Sprint 57a. A student is Grade 3 this year and Grade 4 next year, but
    // STUDENT holds ONE grade_level/section — so every past IPTR silently
    // re-rendered with today's grade, and a past-year DOH report broken down
    // by grade was computed from grades nobody had at the time. The IPTR is
    // already the per-school-year container, so this is where a year-varying
    // value belongs, and "when do we update the grade?" answers itself: when
    // that year's IPTR is created.
    //
    // Optional on purpose. Records created before this sprint have no truthful
    // value to backfill (see migrateIptrGrades.ts — only the LATEST IPTR can be
    // filled honestly), and the UI says "not recorded" rather than inventing
    // one. STUDENT keeps its own grade_level/section as the CURRENT values,
    // which is what enrolment lists and the appointment roster want.
    grade_level: { type: String, default: null },
    section: { type: String, default: null },
    ...softDeleteFields,
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

export default getModel("StudentIptr", studentIptrSchema);
