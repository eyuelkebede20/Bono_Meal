import express from "express";
import "dotenv/config";
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
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(
  cors({
    origin: "https://localhost:5173",
    credentials: true,
  }),
);
runDailyDeduction();
startCronJobs();
app.use("/api/telegram", telegramRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", router);
app.use("/api/users", userRouter);
app.use("/api", adminRouter);
app.use("/api/topups", topUpRoutes);
app.use("/api/attendance", attendanceRoutes);

app.listen(PORT, () => {
  try {
    connectDb(process.env.MONGO_URI);
    console.log("app is loading perfectly");
  } catch (error) {
    console.log({ error });
  }
});
