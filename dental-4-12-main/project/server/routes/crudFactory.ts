import { Router } from "express";
import mongoose, { type Model } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLog.js";
import { ALL_ROLES, ADMIN_ONLY } from "../middleware/roleGroups.js";

const PROTECTED_FIELDS = [
  "_id", "isArchived", "archivedAt", "archivedBy", "created_at", "updated_at",
  "password_hash",
  // 2FA/reset fields are managed only by their dedicated endpoints
  "twofa_enabled", "otp_hash", "otp_expires", "reset_token_hash", "reset_token_expires",
];

function sanitizeBody(body: Record<string, unknown>) {
  const clean = { ...body };
  for (const field of PROTECTED_FIELDS) delete clean[field];
  return clean;
}

// mongoose-field-encryption leaves encrypted fields as ciphertext on the in-memory
// document after create()/save() (decryption only happens on read via post('init')).
// Decrypt in place before sending the response, without touching the DB.
function decryptForResponse(doc: any) {
  if (typeof doc.decryptFieldsSync === "function") doc.decryptFieldsSync();
  return doc;
}

interface CrudOptions {
  readOnly?: boolean;
  readRoles?: string[];
  writeRoles?: string[];
  archiveRoles?: string[];
  /** Who may un-archive. Split from archiveRoles so a model can let clinical
   *  staff archive their own records while restore stays System Admin only,
   *  per the soft-delete rule in CLAUDE.md. */
  restoreRoles?: string[];
  /** Override the create audit action string from the request body (e.g.
   *  RISK_STRATIFICATION records whether the dentist accepted or changed the
   *  AI suggestion). Return undefined to keep the default "Created X". */
  auditCreateAction?: (body: Record<string, unknown>) => string | undefined;
  /** Reject a POST that would duplicate an existing record on these fields.
   *  Added 2026-08-11 after a double-submit on "Add Year" created two
   *  StudentIptr rows for one school year a second apart, which surfaced as a
   *  repeated year in the DMFT History table and an inflated "Years tracked".
   *  Guards every client, not just the button that caused it. */
  uniqueBy?: string[];
}

export function createCrudRouter(model: Model<any>, options: CrudOptions = {}) {
  const router = Router();
  const hasSoftDelete = !!model.schema.path("isArchived");
  const readOnly = options.readOnly === true;
  const readRoles = options.readRoles ?? ALL_ROLES;
  const writeRoles = options.writeRoles ?? ADMIN_ONLY;
  const archiveRoles = options.archiveRoles ?? ADMIN_ONLY;
  const restoreRoles = options.restoreRoles ?? ADMIN_ONLY;
  const modelName = model.modelName;

  router.get(
    "/",
    requireAuth,
    requireRole(...readRoles),
    asyncHandler(async (req, res) => {
      const wantsArchived = req.query.includeArchived === "true";
      if (wantsArchived && !ADMIN_ONLY.includes(req.user!.role)) {
        res.status(403).json({ error: "Only System Admin can view archived records" });
        return;
      }
      const filter = hasSoftDelete && !wantsArchived ? { isArchived: false } : {};
      const docs = await model.find(filter);
      res.json(docs);
    }),
  );

  router.get(
    "/:id",
    requireAuth,
    requireRole(...readRoles),
    asyncHandler(async (req, res) => {
      if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }
      const doc = await model.findById(req.params.id);
      if (!doc) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      // Archived records are only visible to System Admin — 404 (not 403) for
      // everyone else so their existence isn't leaked.
      if (hasSoftDelete && (doc as any).isArchived && !ADMIN_ONLY.includes(req.user!.role)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(doc);
    }),
  );

  if (readOnly) return router;

  router.post(
    "/",
    requireAuth,
    requireRole(...writeRoles),
    asyncHandler(async (req, res) => {
      const body = sanitizeBody(req.body);
      if (options.uniqueBy && options.uniqueBy.every((f) => body[f] !== undefined)) {
        const filter: Record<string, unknown> = {};
        for (const f of options.uniqueBy) filter[f] = body[f];
        // Archived records still count: restoring one would otherwise
        // resurrect a duplicate that passed this check while hidden.
        const existing = await model.findOne(filter).lean();
        if (existing) {
          res.status(409).json({ error: `A ${modelName} already exists for that ${options.uniqueBy.join(" + ")}` });
          return;
        }
      }
      const doc = await model.create(body);
      const action = options.auditCreateAction?.(req.body) ?? `Created ${modelName}`;
      await logAudit(req.user!.id, action, doc._id.toString(), modelName);
      res.status(201).json(decryptForResponse(doc));
    }),
  );

  router.put(
    "/:id",
    requireAuth,
    requireRole(...writeRoles),
    asyncHandler(async (req, res) => {
      if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }
      // Loads + mutates + .save() rather than findByIdAndUpdate: the latter's
      // pre('findOneAndUpdate') hook in mongoose-field-encryption has a bug that
      // corrupts encrypted fields and crashes on the next decrypt (calls a removed
      // Node crypto API). save() goes through the working pre('save') hook instead.
      const doc = await model.findById(req.params.id);
      if (!doc) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      Object.assign(doc, sanitizeBody(req.body));
      await doc.save();
      await logAudit(req.user!.id, `Updated ${modelName}`, (doc._id as any).toString(), modelName);
      res.json(decryptForResponse(doc));
    }),
  );

  if (hasSoftDelete) {
    router.patch(
      "/:id/archive",
      requireAuth,
      requireRole(...archiveRoles),
      asyncHandler(async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
          res.status(400).json({ error: "Invalid id" });
          return;
        }
        const doc = await model.findByIdAndUpdate(
          req.params.id,
          { isArchived: true, archivedAt: new Date(), archivedBy: req.user!.id },
          { new: true },
        );
        if (!doc) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        await logAudit(req.user!.id, `Archived ${modelName}`, (doc._id as any).toString(), modelName);
        res.json(doc);
      }),
    );

    router.patch(
      "/:id/restore",
      requireAuth,
      requireRole(...restoreRoles),
      asyncHandler(async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
          res.status(400).json({ error: "Invalid id" });
          return;
        }
        const doc = await model.findByIdAndUpdate(
          req.params.id,
          { isArchived: false, archivedAt: null, archivedBy: null },
          { new: true },
        );
        if (!doc) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        await logAudit(req.user!.id, `Restored ${modelName}`, (doc._id as any).toString(), modelName);
        res.json(doc);
      }),
    );
  }

  return router;
}
