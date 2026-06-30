import { Router } from "express";
import mongoose, { type Model } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";

const PROTECTED_FIELDS = ["_id", "isArchived", "archivedAt", "archivedBy", "created_at", "updated_at", "password_hash"];

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

export function createCrudRouter(model: Model<any>, options: { readOnly?: boolean } = {}) {
  const router = Router();
  const hasSoftDelete = !!model.schema.path("isArchived");
  const readOnly = options.readOnly === true;

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filter = hasSoftDelete && req.query.includeArchived !== "true" ? { isArchived: false } : {};
      const docs = await model.find(filter);
      res.json(docs);
    }),
  );

  router.get(
    "/:id",
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
      res.json(doc);
    }),
  );

  if (readOnly) return router;

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const doc = await model.create(sanitizeBody(req.body));
      res.status(201).json(decryptForResponse(doc));
    }),
  );

  router.put(
    "/:id",
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
      res.json(decryptForResponse(doc));
    }),
  );

  if (hasSoftDelete) {
    router.patch(
      "/:id/archive",
      asyncHandler(async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
          res.status(400).json({ error: "Invalid id" });
          return;
        }
        const doc = await model.findByIdAndUpdate(
          req.params.id,
          { isArchived: true, archivedAt: new Date(), archivedBy: req.body.archivedBy ?? null },
          { new: true },
        );
        if (!doc) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        res.json(doc);
      }),
    );

    router.patch(
      "/:id/restore",
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
        res.json(doc);
      }),
    );
  }

  return router;
}
