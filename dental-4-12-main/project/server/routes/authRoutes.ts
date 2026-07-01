import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, refresh, logout, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Login is the real brute-force target (password guessing). ~10 staff users
// at this app's scale — 10 attempts per 15 minutes per IP is generous for a
// legitimate typo-prone login, but shuts down automated guessing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

router.post("/login", loginLimiter, asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", logout);
router.get("/me", requireAuth, asyncHandler(me));

export default router;
