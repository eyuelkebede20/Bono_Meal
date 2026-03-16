import express from "express";
import { requestHalt, adminApprove, financeRefund, getRequests } from "../controllers/halt.controller.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.checker.js";

const haltRoutes = express.Router();

haltRoutes.post("/", authMiddleware, roleMiddleware(["student", "military_student", "military_staff"]), requestHalt);
haltRoutes.get("/", authMiddleware, roleMiddleware(["super_admin", "finance_admin"]), getRequests);
haltRoutes.patch("/:id/approve", authMiddleware, roleMiddleware(["super_admin"]), adminApprove);
haltRoutes.patch("/:id/refund", authMiddleware, roleMiddleware(["finance_admin"]), financeRefund);

export default haltRoutes;
