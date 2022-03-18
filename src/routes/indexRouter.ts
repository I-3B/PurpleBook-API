import express, { Request, Response } from "express";
import authenticateRoute from "../utils/authenticateRoute";
import APIRouter from "./APIRouter";
const router = express.Router();

router.use("/api", authenticateRoute, APIRouter);
router.use("/", (req: Request, res: Response) => {
    return res.status(200).json({ home: "hello" });
});

export default router;
