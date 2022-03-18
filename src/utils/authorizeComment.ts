import { NextFunction, Request, Response } from "express";
import Comment from "../models/Comment";

const authorizeComment = async (req: Request, res: Response, next: NextFunction) => {
    const comment = await Comment.findById(req.params.commentId, { authorId: 1 });
    if (!comment) {
        return res.status(404).json({ message: "comment not found" });
    }
    if (req.user.id !== comment.authorId.toString()) {
        return res.status(403).json({ message: "User is not authorized to change this comment" });
    }

    return next();
};
export default authorizeComment;
