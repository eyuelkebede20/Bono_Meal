import express from "express";
import { login, signup, logout, refreshAccessToken } from "../controllers/auth.controllers.js";
import { requestOtp, verifyOtp, verifySignup, forgotPassword, resetPassword, emergencyRegister } from "../controllers/auth.controllers.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.checker.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-signup", verifySignup);
router.post("/login", login);

// NEW: Refresh Token Route
router.post("/refresh-token", refreshAccessToken);

// PROTECTED: Logout now requires authMiddleware so we can get req.user.id
router.post("/logout", authMiddleware, logout);

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/emergency-register", authMiddleware, roleMiddleware(["security_guard", "super_admin"]), emergencyRegister);

export default router;
