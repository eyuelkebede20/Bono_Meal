import express from "express";
import { getCafeLordStats } from "../controllers/cafe.controller.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.checker.js";

const cafeRoutes = express.Router();

cafeRoutes.get("/stats", authMiddleware, roleMiddleware(["cafe_lord", "super_admin"]), getCafeLordStats);

export default cafeRoutes;
