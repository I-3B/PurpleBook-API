import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import mongoose, { ObjectId } from "mongoose";
import Post from "../models/Post";
import User from "../models/User";
import { addLikedByUserFieldAndRemoveLikesField } from "../utils/manipulateModel";
export const POST_CHARACTERS_LIMIT = 5000;
const postController = {
    getFeed: async (req: Request, res: Response) => {
        const { limit, skip } = req.query;
        const limitInt = parseInt(limit + "");
        const skipInt = parseInt(skip + "");
        const limitValue = isNaN(limitInt) ? 20 : limitInt;
        const skipValue = isNaN(skipInt) ? 0 : skipInt;

        const { friends } = await User.findOne({ _id: req.user.id }, { friends: 1 });
        const matchPostAuthors = [req.user.id, ...friends];
        const matchPostAuthorsAsObjectId = matchPostAuthors.map((authorId) => {
            return new mongoose.Types.ObjectId(authorId);
        });
        const posts = await Post.aggregate([
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
                $project: {
                    author: { _id: 1, firstName: 1, lastName: 1, imageMini: 1 },
                    content: 1,
                    likes: 1,
                    likesCount: { $size: "$likes" },
                    commentsCount: { $size: "$comments" },
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        const editedPosts = posts.map((post) => {
            return addLikedByUserFieldAndRemoveLikesField(post, req.user.id);
        });
        return res.status(200).json({ posts: editedPosts });
    },

    addPost: [
        body("content")
            .trim()
            .isLength({ max: POST_CHARACTERS_LIMIT })
            .withMessage(`post content can not be more than ${POST_CHARACTERS_LIMIT} characters`),
        async (req: Request, res: Response) => {
            //TODO post image
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
        const [post]: Array<{ likes: Array<ObjectId> }> = await Post.aggregate([
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
                    likes: 1,
                    likesCount: { $size: "$likes" },
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        if (!post) return res.sendStatus(404);

        const editedPost = addLikedByUserFieldAndRemoveLikesField(post, req.user.id);
        return res.status(200).json({
            post: editedPost,
        });
    },
    editPost: [
        body("content")
            .trim()
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

    addLike: async (req: Request, res: Response) => {
        const result = await Post.updateOne(
            { _id: req.params.postId, likes: { $nin: [req.user.id] } },
            {
                $push: {
                    likes: req.user.id,
                },
            }
        );
        if (result.modifiedCount == 0) {
            const postFound = await Post.findById(req.params.postId).count();
            if (postFound) return res.sendStatus(400);
            else return res.sendStatus(404);
        }
        return res.sendStatus(200);
    },
    getLikes: async (req: Request, res: Response) => {
        const post = await Post.findById(req.params.postId, { likes: 1 }).populate("likes", {
            firstName: 1,
            lastName: 1,
            imageMini: 1,
        });
        if (!post) return res.sendStatus(404);
        return res.status(200).json({ likes: post.likes });
    },
    unlike: async (req: Request, res: Response) => {
        const result = await Post.updateOne(
            { _id: req.params.postId, likes: req.user.id },
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

export default postController;
