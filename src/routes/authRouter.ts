import express from "express";
import multer from "multer";
import authController from "../controllers/authController";
const router = express.Router();
const upload = multer();
router.post("/signup", upload.any(), authController.signup);
router.post("/login", authController.login);
export default router;
