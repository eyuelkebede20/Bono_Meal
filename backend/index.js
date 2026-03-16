import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDb from "./src/config/db.js";
import router from "./src/routes/auth.routes.js";
import userRouter from "./src/routes/user.routes.js";
import adminRouter from "./src/routes/admin.transaction.routes.js";
import runDailyDeduction from "./src/config/dailyDeduction.js";
import topUpRoutes from "./src/routes/topups.routes.js";
import attendanceRoutes from "./src/routes/attendance.routes.js";
import { startCronJobs } from "./src/utils/cronJobs.js";
import telegramRoutes from "./src/routes/telegram.js";
import adminRoutes from "./src/routes/admin.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: ["https://bonomeal.senaycreatives.com", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/telegram", telegramRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", router);
app.use("/api/users", userRouter);
app.use("/api", adminRouter);
app.use("/api/topups", topUpRoutes);
app.use("/api/attendance", attendanceRoutes);

// Connect DB first, then start server and jobs
app.listen(PORT, async () => {
  try {
    await connectDb(process.env.MONGO_URI);
    console.log("Database connected successfully.");

    // Start jobs ONLY after DB is connected
    runDailyDeduction();
    startCronJobs();

    console.log(`Server running on port ${PORT}`);
  } catch (error) {
    console.log("Server startup error:", error);
  }
});
