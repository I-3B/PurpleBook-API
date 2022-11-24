import { Request, Response } from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification";
import parseQuery from "../utils/parseQuery";

const notificationController = {
  getNotifications: async (req: Request, res: Response) => {
    const { skip, limit } = req.query;
    const { skipValue, limitValue } = parseQuery(limit as string, 15, skip as string);
    const notifications = await Notification.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user?.id.toString()),
        },
      },
      {
        $project: {
          updatedAt: 0,
          userId: 0,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: skipValue + limitValue },
      { $skip: skipValue },
    ]);
    return res.status(200).json({ notifications });
  },
  setNotificationsAsViewed: async (req: Request, res: Response) => {
    await Notification.updateMany({ userId: req.user?.id, viewed: false }, { viewed: true });
    return res.sendStatus(200);
  },
};

export default notificationController;
