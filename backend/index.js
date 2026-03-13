import express from "express";
import "dotenv/config";
import connectDb from "./src/config/db.js";
import router from "./src/routes/auth.routes.js";
import userRouter from "./src/routes/user.routes.js";
import adminRouter from "./src/routes/admin.transaction.routes.js";
import runDailyDeduction from "./src/config/dailyDeduction.js";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "https://localhost:5173",
    credentials: true,
  }),
);
runDailyDeduction();
app.use("/api/auth", router);
app.use("/api/users", userRouter);
app.use("/api/", adminRouter);

app.listen(process.env.PORT, () => {
  try {
    connectDb(process.env.MONGO_URI);
    console.log("app is loading perfectly");
  } catch (error) {
    console.log({ error });
  }
});
