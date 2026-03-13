import express from "express";
import { fetchAllUsers, fetchSome, scanUser, approveUser, pendingUser, topUpUser, registerNewUser, updateExisting, deleteUser } from "../controllers/user.controllers.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.checker.js";
const userRouter = express.Router();

userRouter.get("/", authMiddleware, roleMiddleware(["super_admin", "finance_admin"]), fetchAllUsers);
userRouter.get("/pending", authMiddleware, roleMiddleware(["super_admin"]), pendingUser);
userRouter.get("/:id", authMiddleware, fetchSome);

userRouter.patch("/:id/approve", authMiddleware, roleMiddleware(["super_admin"]), approveUser);

userRouter.post("/topup", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), topUpUser);

userRouter.post("/", registerNewUser);

userRouter.put("/{id}", updateExisting);
userRouter.delete("/{id}", deleteUser);

export default userRouter;
