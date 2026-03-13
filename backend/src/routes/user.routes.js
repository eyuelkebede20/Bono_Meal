import express from "express";
import { fetchAllUsers, fetchSome, approveUser, pendingUser } from "../controllers/user.controllers.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.checker.js";
const userRouter = express.Router();

userRouter.get("/", authMiddleware, roleMiddleware(["super_admin", "finance_admin"]), fetchAllUsers);
userRouter.get("/pending", authMiddleware, roleMiddleware(["super_admin"]), pendingUser);
userRouter.get("/:id", authMiddleware, fetchSome);

userRouter.patch("/:id/approve", authMiddleware, roleMiddleware(["super_admin"]), approveUser);

export default userRouter;
