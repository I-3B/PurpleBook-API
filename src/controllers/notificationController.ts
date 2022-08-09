import { Request, Response } from "express";
import Notification from "../models/Notification";
import parseQuery from "../utils/parseQuery";

const notificationController = {
    getNotifications: async (req: Request, res: Response) => {
        const { skip, limit } = req.query;
        const { skipValue, limitValue } = parseQuery(limit as string, 15, skip as string);
        const notifications = await Notification.find(
            { userId: req.user.id },
            { updatedAt: 0, userId: 0 }
        )
            .sort({ createdAt: -1 })
            .skip(skipValue)
            .limit(limitValue);
        return res.status(200).json({ notifications });
    },
    setNotificationsAsViewed: async (req: Request, res: Response) => {
        await Notification.updateMany({ userId: req.user.id, viewed: false }, { viewed: true });
        return res.sendStatus(200);
    },
};

export default notificationController;
