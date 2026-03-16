// routes/admin.js
import express from "express";
import { getSystemStats, approveUser } from "../controllers/superadmin.controllers.js";
import { authMiddleware } from "../middleware/auth.checker.js";
import { roleMiddleware } from "../middleware/auth.checker.js";
import { toggleApproval } from "../controllers/superadmin.controllers.js";
import { getCafeLordStats } from "../controllers/cafe.controller.js";

const adminRoutes = express.Router();
adminRoutes.patch("/users/:id/approve", authMiddleware, roleMiddleware(["super_admin"]), approveUser);
adminRoutes.get("/stats", authMiddleware, roleMiddleware(["super_admin"]), getSystemStats);
adminRoutes.patch("/users/:userId/toggle", toggleApproval);

adminRoutes.get("/cafe/stats", roleMiddleware(["super_admin", "cafe_lord"]), getCafeLordStats);

export default adminRoutes;
