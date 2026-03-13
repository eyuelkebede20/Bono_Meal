import express from "express";
import { login, signup, logout } from "../controllers/auth.controllers.js";
import { requestOtp, verifyOtp, verifySignup, forgotPassword, resetPassword } from "../controllers/auth.controllers.js";
const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.post("/logout", logout);

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);

router.post("/verify-signup", verifySignup);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
export default router;
