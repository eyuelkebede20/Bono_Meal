import express from "express";
import { getSystemStats, toggleApproval } from "../controllers/superadmin.controllers.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.checker.js";
import { getCafeLordStats } from "../controllers/cafe.controller.js"; // Assuming you still have this

const adminRoutes = express.Router();

// FIXED: Added authMiddleware to toggle and cafe stats
adminRoutes.patch("/users/:userId/toggle", authMiddleware, roleMiddleware(["super_admin"]), toggleApproval);
adminRoutes.get("/stats", authMiddleware, roleMiddleware(["super_admin", "finance_admin"]), getSystemStats);
adminRoutes.get("/cafe/stats", authMiddleware, roleMiddleware(["super_admin", "cafe_manager"]), getCafeLordStats);

export default adminRoutes;
