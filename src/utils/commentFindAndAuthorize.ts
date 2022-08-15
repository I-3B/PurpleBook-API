import { NextFunction, Request, Response } from "express";
import Comment from "../models/Comment";

const commentFindAndAuthorize = async (req: Request, res: Response, next: NextFunction) => {
    const comment = await Comment.findById(req.params.commentId, { authorId: 1 });
    if (!comment) {
        return res.sendStatus(404);
    }
    if (req.user?.id !== comment.authorId.toString() && !req.user?.isAdmin) {
        return res.sendStatus(403);
    }

    return next();
};
export default commentFindAndAuthorize;
