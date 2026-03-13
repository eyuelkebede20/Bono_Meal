import express from "express";
import { recordAttendance, getStudentAttendance } from "../controllers/attendance.controllers.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.checker.js";

const attendanceRoutes = express.Router();

attendanceRoutes.post("/scan", authMiddleware, roleMiddleware(["security_guard", "super_admin"]), recordAttendance);
attendanceRoutes.get("/student/:studentId", authMiddleware, roleMiddleware(["super_admin", "finance_admin"]), getStudentAttendance);

export default attendanceRoutes;
