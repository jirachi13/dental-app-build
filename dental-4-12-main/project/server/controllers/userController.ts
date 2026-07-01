import type { Request, Response } from "express";
import { User, ROLES } from "../models/index.js";
import { hashPassword } from "../utils/password.js";
import { logAudit } from "../utils/auditLog.js";

export async function createUser(req: Request, res: Response) {
  const { full_name, email, role, school_id, password } = req.body;

  if (!full_name || !email || !role || !password) {
    res.status(400).json({ error: "full_name, email, role, and password are required" });
    return;
  }
  if (!ROLES.includes(role)) {
    res.status(400).json({ error: `role must be one of: ${ROLES.join(", ")}` });
    return;
  }
  // Length over complexity rules, per NIST guidance — a long passphrase beats
  // a short password with forced special characters.
  if (String(password).length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const password_hash = await hashPassword(password);
  const user = await User.create({
    full_name,
    email: String(email).toLowerCase().trim(),
    role,
    school_id: school_id || null,
    password_hash,
  });

  await logAudit(req.user!.id, "Created User", user._id.toString(), "User");

  const safeUser = await User.findById(user._id);
  res.status(201).json(safeUser);
}
