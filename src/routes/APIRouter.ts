import express from "express";
import authRouter from "./authRouter";
import userRouter from "./userRouter";
const router = express.Router();
router.use("/auth", authRouter);
router.use("/users", userRouter);
export default router;
