import { Router } from "express";
import { login, refresh, logout, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", logout);
router.get("/me", requireAuth, asyncHandler(me));

export default router;
