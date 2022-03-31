import { Request, Response } from "express";
import Notification from "../models/Notification";

const notificationController = {
    getNotifications: async (req: Request, res: Response) => {
        const notifications = await Notification.find(
            { userId: req.user.id },
            { updatedAt: 0 }
        ).sort({ createdAt: -1 });
        return res.status(200).json({ notifications });
    },
    setNotificationsAsViewed: async (req: Request, res: Response) => {
        await Notification.updateMany({ userId: req.user.id, viewed: false }, { viewed: true });
        return res.sendStatus(200);
    },
};

export default notificationController;
