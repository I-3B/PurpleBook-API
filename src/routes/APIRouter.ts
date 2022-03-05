import express, { Response } from "express";
import User from "../models/User";
import authRouter from "./authRouter";
import userRouter from "./userRouter";
const router = express.Router();
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.get("/test", async (req, res: Response) => {
    const result = await User.findOneAndUpdate(
        {
            email: "abcc",
        },
        { firstName: "a", lastName: "b", password: "d" },
        { upsert: true }
    );
    return res.status(200).json({ result });
});
export default router;
