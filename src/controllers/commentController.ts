import { Request, Response } from "express";
import { validationResult } from "express-validator";
import mongoose, { PipelineStage } from "mongoose";
import Comment from "../models/Comment";
import Post from "../models/Post";
import { addLikedByUserFieldAndRemoveLikesField } from "../utils/manipulateModel";
import notificationHandler from "../utils/notificationHandler";
import { validateCommentContent } from "../utils/validateForm";
const commentController = {
    addComment: [
        validateCommentContent,
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
            await notificationHandler.postCommentedOn(req.user.id, postId, comment._id);
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
            sort === "date" ? { $sort: { createdAt: -1 } } : { $sort: { likesCount: -1 } };
        let comments = await Comment.aggregate([
            {
                $match: {
                    postId: new mongoose.Types.ObjectId(req.params.postId),
                },
            },
            {
                $addFields: { likesCount: { $size: { $ifNull: ["$likes", []] } } },
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
                    likesCount: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        const editedComments = comments.map((comment: any) => {
            comment.author = comment.author[0];
            return addLikedByUserFieldAndRemoveLikesField(comment, req.user.id);
        });
        return res.status(200).json({
            comments: editedComments,
        });
    },
    editComment: [
        validateCommentContent,
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
