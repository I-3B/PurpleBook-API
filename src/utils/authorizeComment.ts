import { NextFunction, Request, Response } from "express";
import Comment from "../models/Comment";

const authorizeComment = async (req: Request, res: Response, next: NextFunction) => {
    const { author } = await Comment.findById(req.params.commentId);
    if (req.user.id !== author.toString()) {
        return res
            .status(403)
            .json({ statusBool: false, message: "User is not authorized to change this comment" });
    } else {
        return next();
    }
};
export default authorizeComment;
