import type { Request, Response } from "express";
import { User } from "../models/index.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { logAudit } from "../utils/auditLog.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_MAX_AGE_MS,
} from "../utils/jwt.js";

const isProd = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("access_token", accessToken, { ...baseCookieOptions, maxAge: ACCESS_COOKIE_MAX_AGE_MS });
  res.cookie("refresh_token", refreshToken, { ...baseCookieOptions, maxAge: REFRESH_COOKIE_MAX_AGE_MS });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim(), isArchived: false }).select(
    "+password_hash",
  );
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const matches = await comparePassword(password, user.password_hash);
  if (!matches) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const payload = { sub: user._id.toString(), role: user.role, school_id: user.school_id?.toString() ?? null };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  setAuthCookies(res, accessToken, refreshToken);

  user.last_login = new Date();
  await user.save();

  const safeUser = await User.findById(user._id);
  res.json(safeUser);
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refresh_token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    // Re-check the DB rather than trusting the token's embedded role/school_id
    // — otherwise a deactivated user or one whose role changed keeps their
    // stale permissions for up to 7 days (the refresh token's lifetime),
    // since minting a new access token from the old payload never noticed.
    const user = await User.findById(payload.sub);
    if (!user || user.isArchived) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }
    const accessToken = signAccessToken({
      sub: user._id.toString(),
      role: user.role,
      school_id: user.school_id?.toString() ?? null,
    });
    res.cookie("access_token", accessToken, { ...baseCookieOptions, maxAge: ACCESS_COOKIE_MAX_AGE_MS });
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}

export function logout(_req: Request, res: Response) {
  res.clearCookie("access_token", baseCookieOptions);
  res.clearCookie("refresh_token", baseCookieOptions);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(user);
}

// Self-service password change -- distinct from userController's
// admin-assisted resetPassword: this requires knowing the CURRENT password
// (proves it's really the account owner), whereas the admin-assisted reset
// exists precisely for when that's not possible.
export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (String(newPassword).length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const user = await User.findById(req.user!.id).select("+password_hash");
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const matches = await comparePassword(currentPassword, user.password_hash);
  if (!matches) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  user.password_hash = await hashPassword(newPassword);
  await user.save();

  await logAudit(user._id.toString(), "Changed Password", user._id.toString(), "User");

  res.json({ success: true });
}
