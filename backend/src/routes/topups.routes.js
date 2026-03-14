import express from "express";
import { submitRequest, getPendingRequests, approveRequest, revertRequest, searchApprovedRequests } from "../controllers/topup.controllers.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.checker.js";

const topUpRoutes = express.Router();

// Only students can submit
topUpRoutes.post("/request", authMiddleware, roleMiddleware(["student"]), submitRequest);

// Finance and Super Admin routes
topUpRoutes.get("/pending", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), getPendingRequests);
topUpRoutes.patch("/:id/approve", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), approveRequest);
topUpRoutes.patch("/:id/revert", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), revertRequest);
topUpRoutes.get("/approved/search", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), searchApprovedRequests);

export default topUpRoutes;
