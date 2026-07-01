import type { Request, Response } from "express";
import { User } from "../models";
import { comparePassword } from "../utils/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_MAX_AGE_MS,
} from "../utils/jwt";

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
