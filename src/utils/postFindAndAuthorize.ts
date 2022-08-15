import { NextFunction, Request, Response } from "express";
import Post from "../models/Post";

const postFindAndAuthorize = async (req: Request, res: Response, next: NextFunction) => {
    const post = await Post.findById(req.params.postId, { authorId: 1 });
    if (!post) {
        return res.sendStatus(404);
    }
    if (req.user.id !== post.authorId.toString() && !req.user.isAdmin) {
        return res.sendStatus(403);
    }

    return next();
};
export default postFindAndAuthorize;
