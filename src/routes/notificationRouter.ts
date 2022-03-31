import express from "express";
import notificationController from "../controllers/notificationController";
const router = express.Router();

router.get("/", notificationController.getNotifications);
router.patch("/", notificationController.setNotificationsAsViewed);

export default router;
