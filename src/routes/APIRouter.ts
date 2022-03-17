import express from "express";
import authorizeUserRoute from "../utils/authorizeUserRoute";
import authRouter from "./authRouter";
import postRouter from "./postRouter";
import userRouter from "./userRouter";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/users/:userId", authorizeUserRoute, userRouter);
router.use("/posts", postRouter);

export default router;
