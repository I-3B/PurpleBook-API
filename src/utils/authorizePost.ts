import { NextFunction, Request, Response } from "express";
import Post from "../models/Post";

const authorizePost = async (req: Request, res: Response, next: NextFunction) => {
    const { authorId } = await Post.findById(req.params.postId, { authorId: 1 });
    if (req.user.id !== authorId.toString()) {
        return res
            .status(403)
            .json({ statusBool: false, message: "User is not authorized to change this post" });
    } else {
        return next();
    }
};
export default authorizePost;