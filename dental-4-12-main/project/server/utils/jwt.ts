import jwt from "jsonwebtoken";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface AuthTokenPayload {
  sub: string;
  role: string;
  school_id: string | null;
}

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return secret;
}

function getRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not set");
  return secret;
}

// Pinned explicitly (not just relying on the default) so a token can never be
// verified under a different algorithm than it was signed with — the
// standard "algorithm confusion" mitigation for jsonwebtoken.
const JWT_ALGORITHM = "HS256";

export function signAccessToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_TOKEN_TTL_SECONDS, algorithm: JWT_ALGORITHM });
}

export function signRefreshToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_TTL_SECONDS, algorithm: JWT_ALGORITHM });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, getAccessSecret(), { algorithms: [JWT_ALGORITHM] }) as AuthTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, getRefreshSecret(), { algorithms: [JWT_ALGORITHM] }) as AuthTokenPayload;
}

export const ACCESS_COOKIE_MAX_AGE_MS = ACCESS_TOKEN_TTL_SECONDS * 1000;
export const REFRESH_COOKIE_MAX_AGE_MS = REFRESH_TOKEN_TTL_SECONDS * 1000;
