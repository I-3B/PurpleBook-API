import express, { Request, Response } from "express";
import checkRouteForAuth from "../utils/checkRouteForAuth";
import APIRouter from "./APIRouter";
const router = express.Router();

router.use("/api", checkRouteForAuth, APIRouter);
router.use("/", (req: Request, res: Response) => {
    return res.status(200).json({ home: "hello" });
});
export default router;
