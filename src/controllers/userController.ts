import { NextFunction, Request, Response } from "express";
import User from "../models/User";
const userController = {
    getUserInfo: async (req: Request, res: Response, next: NextFunction) => {
        const user = await User.findById(req.params.id).catch((err) => {
            return next(err);
        });
        if (user) {
            return res
                .status(200)
                .json({ status: true, message: "User found", user: user });
        }
        return res
            .status(404)
            .json({ status: false, message: "User not found" });
    },
};

export default userController;
