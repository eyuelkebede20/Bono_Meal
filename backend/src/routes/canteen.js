import express from "express";
import { authMiddleware, roleMiddleware } from "../middleware/authMiddleware.js";
import card from "../models/card.js";

const scanRouter = express.Router();

// POST /api/canteen/scan - Accessed by the canteen staff/scanner device
scanRouter.post("/scan", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), async (req, res) => {});

export default scanRouter;
