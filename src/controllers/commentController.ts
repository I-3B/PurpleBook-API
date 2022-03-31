import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import mongoose, { ObjectId, PipelineStage } from "mongoose";
import Comment from "../models/Comment";
import Post from "../models/Post";
import { addLikedByUserFieldAndRemoveLikesField } from "../utils/manipulateModel";
import notificationHandler from "../utils/notificationHandler";
export const COMMENT_CHARACTERS_LIMIT = 2500;
const commentController = {
    addComment: [
        body("content")
            .trim()
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
            await notificationHandler.postCommentedOn(req.user.id,postId,comment._id)
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
                    likes: 1,
                    likesCount: { $size: "$likes" },
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        const editedComments = comments.map(
            (comment: { likes: Array<ObjectId>; likedByUser?: boolean }) => {
                return addLikedByUserFieldAndRemoveLikesField(comment, req.user.id);
            }
        );
        return res.status(200).json({
            comments: editedComments,
        });
    },
    editComment: [
        body("content")
            .trim()
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
        const result = await Comment.deleteOne({ _id: req.params.commentId });
        if (result.deletedCount == 0) return res.sendStatus(404);
        return res.sendStatus(200);
    },

    addLike: async (req: Request, res: Response) => {
        const result = await Comment.updateOne(
            { _id: req.params.commentId, likes: { $nin: [req.user.id] } },
            {
                $push: {
                    likes: req.user.id,
                },
            }
        );
        if (result.modifiedCount == 0) {
            const commentFound = await Comment.findById(req.params.commentId).count();
            if (commentFound) return res.sendStatus(400);
            else return res.sendStatus(404);
        }
        await notificationHandler.commentLiked(
            req.user.id,
            req.params.postId,
            req.params.commentId
        );
        return res.sendStatus(200);
    },
    getLikes: async (req: Request, res: Response) => {
        const comment = await Comment.findById(req.params.commentId, { likes: 1 }).populate(
            "likes",
            {
                firstName: 1,
                lastName: 1,
                imageMini: 1,
            }
        );
        if (!comment) return res.sendStatus(404);
        return res.status(200).json({ likes: comment.likes });
    },
    unlike: async (req: Request, res: Response) => {
        const result = await Comment.updateOne(
            { _id: req.params.commentId, likes: req.user.id },
            {
                $pull: {
                    likes: req.user.id,
                },
            }
        );
        if (result.modifiedCount == 0) {
            if (result.matchedCount == 1) return res.sendStatus(400);
            else return res.sendStatus(404);
        }
        return res.sendStatus(200);
    },
};

export default commentController;
