import express from "express";
import multer from "multer";
import passport from "passport";
import authController from "../controllers/authController";
const router = express.Router();
const upload = multer();
router.post("/signup", upload.any(), authController.signup);
router.post("/login", authController.login);
router.post(
    "/facebook",
    passport.authenticate("facebook-token", { session: false }),
    authController.facebookLogin
);

export default router;
