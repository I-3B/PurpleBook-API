import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import Post from "../models/Post";
export const POST_CHARACTERS_LIMIT = 5000;
const postController = {
    addPost: [
        body("content")
            .isLength({ max: POST_CHARACTERS_LIMIT })
            .withMessage(`post content can not be more than ${POST_CHARACTERS_LIMIT} characters`),
        async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: [...errors.array()],
                });
            }
            const post = await Post.create({
                authorId: req.user.id,
                content: req.body.content,
            });
            return res.status(201).json({
                postId: post._id,
            });
        },
    ],
    getPost: async (req: Request, res: Response) => {
        const [post] = await Post.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.params.postId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "authorId",
                    foreignField: "_id",
                    as: "author",
                },
            },

            {
                $project: {
                    author: { _id: 1, firstName: 1, lastName: 1, imageMini: 1 },
                    content: 1,
                    image: 1,
                    likesCount: { $size: "$likes" },
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);

        if (!post) return res.sendStatus(404);
        return res.status(200).json({
            post: post,
        });
    },
    editPost: [
        body("content")
            .isLength({ max: POST_CHARACTERS_LIMIT })
            .withMessage(`post content can not be more than ${POST_CHARACTERS_LIMIT} characters`),
        async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: [...errors.array()],
                });
            }
            await Post.updateOne({ _id: req.params.postId });

            return res.sendStatus(200);
        },
    ],
    deletePost: async (req: Request, res: Response) => {
        await Post.deleteOne({ _id: req.params.postId });
        return res.sendStatus(200);
    },
};

export default postController;
