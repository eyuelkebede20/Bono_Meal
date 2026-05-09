import express from "express";
import "dotenv/config";
import cors from "cors";

import router from "./src/routes/auth.routes.js";
import userRouter from "./src/routes/user.routes.js";
import adminRouter from "./src/routes/admin.transaction.routes.js";
import topUpRoutes from "./src/routes/topups.routes.js";
import attendanceRoutes from "./src/routes/attendance.routes.js";
import { startCronJobs } from "./src/utils/cronJobs.js";
import telegramRoutes from "./src/config/telegram.js";
import cafeRoutes from "./src/routes/cafe.routes.js";
import adminRoutes from "./src/routes/admin.js";
import haltRoutes from "./src/routes/halt.routes.js";
import "./telegramBot.js";

import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(
  cors({
    origin: ["https://bonomeal.senaycreatives.com", "https://localhost:5173", "https://apibonomeal.senaycreatives.com/"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  }),
);

app.use("/api/telegram", telegramRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", router);
app.use("/api/users", userRouter);
app.use("/api/topups", topUpRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/cafe", cafeRoutes);
app.use("/api/halt", haltRoutes);
app.use("/api", adminRouter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(PORT, () => {
  try {
    console.log("Database connection pool initialized via Drizzle.");

    // Start jobs (This handles BOTH Military Allowance and Daily ETB Deductions now)
    startCronJobs();

    console.log(`Server running on port ${PORT}`);
  } catch (error) {
    console.log("Server startup error:", error);
  }
});
