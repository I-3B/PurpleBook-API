import express from "express";
import multer from "multer";
import userController from "../controllers/userController";
import authorizeUserRoute from "../utils/authorizeUserRoute";
const router = express.Router();
const upload = multer();

router.get("/:id", authorizeUserRoute, userController.getUser);
router.put("/:id", authorizeUserRoute, upload.any(), userController.editUser);
export default router;
