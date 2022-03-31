import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import mongoose, { ObjectId } from "mongoose";
import Comment from "../models/Comment";
import Post from "../models/Post";
import User from "../models/User";
import { addLikedByUserFieldAndRemoveLikesField } from "../utils/manipulateModel";
import notificationHandler from "../utils/notificationHandler";
import { createProfilePicture, isImage } from "../utils/processImage";

const userController = {
    //send user's full profile if the requester is the user
    //else it will send the profile without sensitive data
    getUser: async (req: Request, res: Response) => {
        const user = await User.findById(req.params.userId, {
            firstName: 1,
            lastName: 1,
            imageFull: 1,
        });
        if (user) {
            return res.status(200).json({ user });
        }
        return res.sendStatus(404);
    },
    editUser: [
        body("firstName")
            .exists()
            .trim()
            .isAlpha()
            .withMessage("First name can only be alphabetic.")
            .isLength({ min: 1, max: 20 })
            .withMessage("First name cannot be empty or more than 20 characters.")
            .escape(),
        body("lastName")
            .exists()
            .trim()
            .isAlpha()
            .withMessage("Last name can only be alphabetic.")
            .isLength({ min: 1, max: 20 })
            .withMessage("Last name cannot be empty or more than 20 characters.")
            .escape(),
        async (req: Request, res: Response) => {
            if (!req.user.userRouteAuthorized) return res.sendStatus(403);
            const errors = validationResult(req);
            const files = req.files as Express.Multer.File[];
            const imageBuffer = files[0] ? files[0].buffer : Buffer.from("");
            const imageMimetype = files[0] ? files[0].mimetype : "";
            const isImageCorrect = await isImage(imageBuffer);
            const profilePicture = await createProfilePicture(imageBuffer);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: [...errors.array()],
                });
            } else {
                const user = await User.findByIdAndUpdate(
                    req.user?.id,
                    {
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        ...(isImageCorrect && {
                            imageMini: {
                                data: profilePicture.mini,
                                contentType: imageMimetype,
                            },
                            imageFull: {
                                data: profilePicture.full,
                                contentType: imageMimetype,
                            },
                        }),
                    },
                    {
                        new: true,
                        fields: {
                            firstName: 1,
                            lastName: 1,
                            imageMini: 1,
                        },
                    }
                );
                if (user)
                    return res.status(200).json({
                        user: user,
                    });
            }
        },
    ],
    deleteUser: async (req: Request, res: Response) => {
        if (!req.user.userRouteAuthorized) {
            return res.sendStatus(403);
        }
        const result = await User.deleteOne({
            _id: req.params.userId,
        });
        if (result) {
            return res.sendStatus(200);
        }
    },
    getPosts: async (req: Request, res: Response) => {
        const posts = await Post.aggregate([
            {
                $match: { authorId: new mongoose.Types.ObjectId(req.params.userId) },
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
                    content: 1,
                    image: 1,
                    likes: 1,
                    likesCount: { $size: "$likes" },
                    commentsCount: { $size: "$comments" },
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        const editedPosts = posts.map((post: { likes: Array<ObjectId>; likedByUser?: boolean }) => {
            return addLikedByUserFieldAndRemoveLikesField(post, req.user.id);
        });

        return res.status(200).json({ posts: editedPosts });
    },
    getComments: async (req: Request, res: Response) => {
        const comments = await Comment.aggregate([
            {
                $match: { authorId: new mongoose.Types.ObjectId(req.params.userId) },
            },
            {
                $lookup: {
                    from: "posts",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "authorId",
                                foreignField: "_id",
                                as: "postAuthor",
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                postAuthorFirstName: "$postAuthor.firstName",
                                contentPreview: { $substr: ["$content", 0, 60] },
                            },
                        },
                    ],
                    localField: "postId",
                    foreignField: "_id",
                    as: "post",
                },
            },
            {
                $project: {
                    post: 1,
                    content: 1,
                    image: 1,
                    likes: 1,
                    likesCount: { $size: "$likes" },
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        comments.map((comment: { post: any }) => {
            comment.post = comment.post[0];
            comment.post.postAuthorFirstName = comment.post.postAuthorFirstName[0];
            return comment;
        });
        return res.status(200).json({ comments: comments });
    },

    getFriendRequests: async (req: Request, res: Response) => {
        if (!req.user.userRouteAuthorized) {
            return res.sendStatus(403);
        }
        const { friendRequests } = await User.findById(req.params.userId, {
            friendRequests: 1,
        }).populate("friendRequests.user", { _id: 1, firstName: 1, lastName: 1, imageMini: 1 });
        return res.status(200).json({
            friendRequests: friendRequests,
        });
    },
    addFriendRequest: async (req: Request, res: Response) => {
        if (req.user?.id === req.params.userId) {
            return res.status(400).json({
                error: "You are sending a friend request to yourself... man this is just sad",
            });
        }
        const [alreadyFriend, userExist] = await Promise.all([
            await User.findOne({
                _id: req.user?.id,
                friends: req?.params.userId,
            }).count(),
            await User.findById(req.params.userId).count(),
        ]);
        if (alreadyFriend)
            return res.status(400).json({
                error: "user is already a friend",
            });
        else if (!userExist) {
            return res.status(404).json({
                error: "the user requested is not found, maybe the account got deleted or it never existed at all",
            });
        } else {
            const result = await User.updateOne(
                {
                    _id: req.params.userId,
                    friendRequests: {
                        $not: { $elemMatch: { user: req.user?.id } },
                    },
                },
                {
                    $push: {
                        friendRequests: {
                            user: req.user?.id,
                            viewed: false,
                        },
                    },
                }
            );
            //user is in friends array?
            if (result?.matchedCount == 0) {
                return res.status(400).json({
                    error: "already sent a friend request",
                });
            }
            return res.sendStatus(200);
        }
    },

    setFriendRequestsAsViewed: async (req: Request, res: Response) => {
        if (!req.user.userRouteAuthorized) {
            return res.sendStatus(403);
        }
        await User.updateOne(
            { _id: req.params.userId, "friendRequests.viewed": false },
            {
                $set: { "friendRequests.$.viewed": true },
            }
        );
        return res.sendStatus(200);
    },
    deleteFriendRequest: async (req: Request, res: Response) => {
        if (!req.user.userRouteAuthorized) {
            return res.sendStatus(403);
        }
        await User.updateOne(
            {
                _id: req.params.userId,
            },
            {
                $pull: {
                    friendRequests: { user: req.params.friendRequestId },
                },
            }
        );

        return res.sendStatus(200);
    },
    acceptFriendRequest: async (req: Request, res: Response) => {
        if (!req.user.userRouteAuthorized) {
            return res.sendStatus(403);
        }
        const userDeletedFromFriendRequests = await User.updateOne(
            {
                _id: req.user.id,
            },
            {
                $pull: {
                    friendRequests: { user: req.params.friendId },
                },
            }
        );
        if (userDeletedFromFriendRequests.modifiedCount === 0) {
            return res.sendStatus(404);
        }
        const session = await User.startSession();
        await session.withTransaction(() => {
            return Promise.all([
                User.updateOne(
                    {
                        _id: req.user?.id,
                    },
                    { $push: { friends: req.params.friendId } }
                ).session(session),
                User.updateOne(
                    {
                        _id: req.params.friendId,
                    },
                    { $push: { friends: req.user?.id } }
                ).session(session),
            ]);
        });
        await session.endSession();
        await notificationHandler.friendRequestAccepted(req.user.id, req.params.friendId);
        return res.sendStatus(200);
    },

    getFriends: async (req: Request, res: Response) => {
        const { friends } = await User.findById(req.params.userId, {
            friends: 1,
        }).populate("friends", { _id: 1, firstName: 1, lastName: 1, imageMini: 1 });
        return res.status(200).json({
            friends: friends,
        });
    },
    deleteFriend: async (req: Request, res: Response) => {
        if (!req.user.userRouteAuthorized) {
            return res.sendStatus(403);
        }
        const session = await User.startSession();
        await session.withTransaction(() => {
            return Promise.all([
                User.updateOne(
                    {
                        _id: req.user?.id,
                    },
                    {
                        $pull: {
                            friends: req.params.friendId,
                        },
                    }
                ).session(session),
                User.updateOne(
                    {
                        _id: req.params.friendId,
                    },
                    {
                        $pull: {
                            friends: req.user?.id,
                        },
                    }
                ).session(session),
            ]);
        });
        await session.endSession();
        return res.sendStatus(200);
    },
};

export default userController;
