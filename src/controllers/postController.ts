import async from "async";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Post from "../models/Post";
import User from "../models/User";
import notificationHandler from "../utils/notificationHandler";
import parseQuery from "../utils/parseQuery";
import { createPostImage, isImage } from "../utils/processImage";
import { validatePostContent } from "../utils/validateForm";
import { getFriendState } from "./userController";
const postController = {
    getFeed: async (req: Request, res: Response) => {
        const { limit, skip } = req.query;
        const { limitValue, skipValue } = parseQuery(limit as string, 20, skip as string);

        const { friends } = await User.findOne({ _id: req.user?.id }, { friends: 1 });
        const matchPostAuthors = [req.user?.id, ...friends];
        const matchPostAuthorsAsObjectId = matchPostAuthors.map((authorId) => {
            return new mongoose.Types.ObjectId(authorId);
        });
        let posts = await Post.aggregate([
            {
                $match: {
                    authorId: { $in: matchPostAuthorsAsObjectId },
                },
            },
            { $sort: { createdAt: -1 } },
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
                $lookup: {
                    from: "comments",
                    localField: "_id",
                    foreignField: "postId",
                    as: "comments",
                },
            },
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
                    image: 1,
                    likedByUser: 1,
                    likesCount: { $size: "$likes" },
                    commentsCount: { $size: "$comments" },
                    createdAt: 1,
                },
            },
        ]);
        posts = posts.map((post) => {
            post.author = post.author[0];
            return post;
        });
        return res.status(200).json({ posts });
    },

    addPost: [
        validatePostContent,
        async (req: Request, res: Response) => {
            const files = req.files as Express.Multer.File[];
            const imageBuffer = files[0] ? files[0].buffer : Buffer.from("");
            const imageMimetype = files[0] ? files[0].mimetype : "";
            const isFileImage = await isImage(imageBuffer);

            const errors = validationResult(req).array();
            if (files[0] && !isFileImage) {
                errors.push({
                    value: files[0].originalname,
                    msg: "file is not an image",
                    param: "image",
                    location: "body",
                });
            }
            if (!isFileImage && req.body.content.length == 0) {
                errors.push({
                    value: "",
                    msg: "content cannot be empty if post does not contain an image",
                    param: "content",
                    location: "body",
                });
            }
            if (errors.length > 0) {
                return res.status(400).json({
                    errors: errors,
                });
            }
            const image = await createPostImage(imageBuffer);
            const post = await Post.create({
                authorId: req.user?.id,
                content: req.body.content,
                image: { data: image, contentType: imageMimetype },
            });
            return res.status(201).json({
                postId: post._id,
            });
        },
    ],
    getPost: async (req: Request, res: Response) => {
        let [post] = await Post.aggregate([
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
                    image: 1,
                    likedByUser: 1,
                    likesCount: { $size: "$likes" },
                    createdAt: 1,
                },
            },
        ]);
        if (!post) return res.sendStatus(404);
        post.author = post.author[0];
        return res.status(200).json({
            post,
        });
    },
    editPost: [
        validatePostContent,
        async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: [...errors.array()],
                });
            }
            await Post.updateOne({ _id: req.params.postId }, { content: req.body.content });

            return res.sendStatus(200);
        },
    ],
    deletePost: async (req: Request, res: Response) => {
        await Post.deleteOne({ _id: req.params.postId });
        return res.sendStatus(200);
    },

    addLike: async (req: Request, res: Response) => {
        const result = await Post.updateOne(
            { _id: req.params.postId, likes: { $nin: [req.user?.id] } },
            {
                $push: {
                    likes: req.user?.id,
                },
            }
        );
        if (result.modifiedCount == 0) {
            const postFound = await Post.findById(req.params.postId).count();
            if (postFound) return res.sendStatus(400);
            else return res.sendStatus(404);
        }
        await notificationHandler.postLiked(req.user?.id || "", req.params.postId);

        return res.sendStatus(200);
    },
    getLikes: async (req: Request, res: Response) => {
        const { skip, limit } = req.query;
        const { skipValue, limitValue } = parseQuery(limit as string, 15, skip as string);
        const post = await Post.findById(req.params.postId, { likes: 1 })
            .populate("likes", {
                firstName: 1,
                lastName: 1,
                imageMini: 1,
            })
            .skip(skipValue)
            .limit(limitValue);
        if (!post) return res.sendStatus(404);
        const users = post.likes;
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
        const result = await Post.updateOne(
            { _id: req.params.postId, likes: req.user?.id },
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

export default postController;
