import async from "async";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Comment from "../models/Comment";
import Post from "../models/Post";
import notificationHandler from "../utils/notificationHandler";
import parseQuery from "../utils/parseQuery";
import { validateCommentContent } from "../utils/validateForm";
import { getFriendState } from "./userController";
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
                authorId: req.user?.id,
                postId: postId,
                content: req.body.content,
            });
            await notificationHandler.postCommentedOn(req.user?.id || "", postId, comment._id);
            return res.status(201).json({
                commentId: comment._id,
            });
        },
    ],
    getAllComments: async (req: Request, res: Response) => {
        const { limit, skip, sort } = req.query;
        const { limitValue, skipValue, sortByStage } = parseQuery(
            limit as string,
            20,
            skip as string,
            sort as string
        );
        let comments = await Comment.aggregate([
            {
                $match: {
                    postId: new mongoose.Types.ObjectId(req.params.postId),
                },
            },
            {
                $addFields: { likesCount: { $size: "$likes" } },
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
            { $unwind: "$author" },
            {
                $addFields: {
                    likedByUser: {
                        $in: [new mongoose.Types.ObjectId(req.user?.id.toString()), "$likes"],
                    },
                },
            },

            {
                $project: {
                    author: { _id: 1, firstName: 1, lastName: 1, imageMini: 1 },
                    content: 1,
                    likedByUser: 1,
                    likesCount: 1,
                    createdAt: 1,
                },
            },
        ]);
        return res.status(200).json({
            comments,
        });
    },
    getComment: async (req: Request, res: Response) => {
        let [comment] = await Comment.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.params.commentId),
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
            { $unwind: "$author" },
            {
                $addFields: {
                    likedByUser: {
                        $in: [new mongoose.Types.ObjectId(req.user?.id.toString()), "$likes"],
                    },
                },
            },
            {
                $project: {
                    author: { _id: 1, firstName: 1, lastName: 1, imageMini: 1 },
                    content: 1,
                    likedByUser: 1,
                    likesCount: { $size: "$likes" },
                    createdAt: 1,
                },
            },
        ]);
        if (!comment) return res.sendStatus(404);
        return res.status(200).json({
            comment,
        });
    },
    editComment: [
        validateCommentContent,
        async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: errors.array(),
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
            { _id: req.params.commentId, likes: { $nin: [req.user?.id] } },
            {
                $push: {
                    likes: req.user?.id,
                },
            }
        );
        if (result.modifiedCount == 0) {
            const commentFound = await Comment.findById(req.params.commentId).count();
            if (commentFound) return res.sendStatus(400);
            else return res.sendStatus(404);
        }
        await notificationHandler.commentLiked(
            req.user?.id || "",
            req.params.postId,
            req.params.commentId
        );
        return res.sendStatus(200);
    },
    getLikes: async (req: Request, res: Response) => {
        const { skip, limit } = req.query;
        const { skipValue, limitValue } = parseQuery(limit as string, 15, skip as string);
        const comment = await Comment.findById(req.params.commentId, { likes: 1 })
            .populate("likes", {
                firstName: 1,
                lastName: 1,
                imageMini: 1,
            })
            .skip(skipValue)
            .limit(limitValue);
        if (!comment) return res.sendStatus(404);
        const users = comment.likes;
        const map = async (
            user: { _id: string; _doc: any },
            done: (arg0: null, arg1: { _id: string; friendState: string }) => void
        ) => {
            const friendState = await getFriendState(req.user?.id || "", user._id);
            done(null, { ...user._doc, friendState });
        };

        const usersWithState = await async.map(users, map);
        return res.status(200).json({ users: usersWithState });
    },
    unlike: async (req: Request, res: Response) => {
        const result = await Comment.updateOne(
            { _id: req.params.commentId, likes: req.user?.id || "" },
            {
                $pull: {
                    likes: req.user?.id,
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
