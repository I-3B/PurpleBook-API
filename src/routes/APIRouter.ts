import express from "express";
import userRouteAuthorize from "../utils/userRouteAuthorize";
import authRouter from "./authRouter";
import notificationRouter from "./notificationRouter";
import postRouter from "./postRouter";
import userRouter from "./userRouter";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/users/:userId", userRouteAuthorize, userRouter);
router.use("/posts", postRouter);
router.use("/notifications", notificationRouter);

export default router;
