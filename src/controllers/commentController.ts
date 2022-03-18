import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import mongoose, { PipelineStage } from "mongoose";
import Comment from "../models/Comment";
import Post from "../models/Post";
export const COMMENT_CHARACTERS_LIMIT = 2500;
const commentController = {
    addComment: [
        body("content")
            .isLength({ max: COMMENT_CHARACTERS_LIMIT })
            .withMessage(
                `comment content can not be more than ${COMMENT_CHARACTERS_LIMIT} characters`
            ),
        async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: [...errors.array()],
                });
            }
            const postId = req.params.postId;
            const postFound = !!(await Post.findById(postId));
            if (!postFound) return res.sendStatus(404);
            const comment = await Comment.create({
                authorId: req.user.id,
                postId: postId,
                content: req.body.content,
            });
            return res.status(201).json({
                commentId: comment._id,
            });
        },
    ],
    getAllComments: async (req: Request, res: Response) => {
        const { limit, skip, sort } = req.query;
        const limitInt = parseInt(limit + "");
        const skipInt = parseInt(skip + "");
        const limitValue = isNaN(limitInt) ? 20 : limitInt;
        const skipValue = isNaN(skipInt) ? 0 : skipInt;
        const sortByStage: PipelineStage =
            sort === "date" ? { $sort: { createdAt: -1 } } : { $sort: { likesCount: 1 } };
        const comments = await Comment.aggregate([
            {
                $match: {
                    postId: new mongoose.Types.ObjectId(req.params.postId),
                },
            },
            sortByStage,
            { $limit: skipValue + limitValue },
            { $skip: skipValue },
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
                    likesCount: { $size: "$likes" },
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);

        return res.status(200).json({
            comments: comments,
        });
    },
    editComment: [
        body("content")
            .isLength({ max: COMMENT_CHARACTERS_LIMIT })
            .withMessage(
                `comment content can not be more than ${COMMENT_CHARACTERS_LIMIT} characters`
            ),
        async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: [...errors.array()],
                });
            }

            await Comment.updateOne({ _id: req.params.commentId }, { content: req.body.content });

            return res.sendStatus(200);
        },
    ],
    deleteComment: async (req: Request, res: Response) => {
        await Comment.deleteOne({ _id: req.params.commentId });
        return res.sendStatus(200);
    },
};

export default commentController;
