// routes/admin.js
import express from "express";
import { getSystemStats, approveUser } from "../controllers/superadmin.controllers.js";
import { authMiddleware } from "../middleware/auth.checker.js";
import { roleMiddleware } from "../middleware/auth.checker.js";

const adminRoutes = express.Router();
adminRoutes.patch("/users/:id/approve", authMiddleware, roleMiddleware(["super_admin"]), approveUser);
adminRoutes.get("/stats", authMiddleware, roleMiddleware(["super_admin"]), getSystemStats);

export default adminRoutes;
