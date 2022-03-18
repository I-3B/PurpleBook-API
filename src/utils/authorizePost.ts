import { NextFunction, Request, Response } from "express";
import Post from "../models/Post";

const authorizePost = async (req: Request, res: Response, next: NextFunction) => {
    const post = await Post.findById(req.params.postId, { authorId: 1 });
    if (!post) {
        return res.status(404).json({
            statusBool: false,
            message: "post not found",
        });
    }
    if (req.user.id !== post.authorId.toString()) {
        return res
            .status(403)
            .json({ statusBool: false, message: "User is not authorized to change this post" });
    }

    return next();
};
export default authorizePost;
