import async from "async";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import mongoose, { ObjectId } from "mongoose";
import Comment from "../models/Comment";
import Post from "../models/Post";
import User from "../models/User";
import { addLikedByUserFieldAndRemoveLikesField } from "../utils/manipulateModel";
import notificationHandler from "../utils/notificationHandler";
import parseQuery from "../utils/parseQuery";
import { createProfilePicture, isImage } from "../utils/processImage";
import { validateFirstAndLastName } from "../utils/validateForm";

const userController = {
    //send user's full profile if the requester is the user
    //else it will send the profile without sensitive data
    getUserHomeData: async (req: Request, res: Response) => {
        const [user] = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user.id.toString()),
                },
            },
            {
                $lookup: {
                    from: "notifications",
                    localField: "_id",
                    foreignField: "userId",
                    as: "notifications",
                },
            },
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    imageMini: 1,
                    friendRequestsCount: { $size: "$friendRequests" },
                    notificationsCount: {
                        $size: {
                            $cond: [{ $isArray: "$notifications" }, "$notifications", []],
                        },
                    },
                },
            },
        ]);
        return res.status(200).json({ user });
    },
    getUser: async (req: Request, res: Response) => {
        const user = await User.findById(req.params.userId, {
            firstName: 1,
            lastName: 1,
            imageFull: 1,
            createdAt: 1,
        });
        if (user) {
            const friendState = await getFriendState(req.user.id, req.params.userId);
            return res.status(200).json({ user: { ...user._doc, friendState } });
        }
        return res.sendStatus(404);
    },
    getUserBeforeEdit: async (req: Request, res: Response) => {
        const user = await User.findById(req.params.userId, {
            firstName: 1,
            lastName: 1,
            imageFull: 1,
        });
        if (!user) {
            return res.sendStatus(404);
        }
        return res.status(200).json({ user });
    },
    editUser: [
        ...validateFirstAndLastName,
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
        const { limit, skip } = req.query;
        const { limitValue, skipValue } = parseQuery(limit as string, 10, skip as string);
        const posts = await Post.aggregate([
            {
                $match: { authorId: new mongoose.Types.ObjectId(req.params.userId) },
            },
            { $sort: { createdAt: -1 } },
            { $limit: skipValue + limitValue },
            { $skip: skipValue },
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
                },
            },
        ]);
        const editedPosts = posts.map((post: { likes: Array<ObjectId>; likedByUser?: boolean }) => {
            return addLikedByUserFieldAndRemoveLikesField(post, req.user.id);
        });

        return res.status(200).json({ posts: editedPosts });
    },
    getComments: async (req: Request, res: Response) => {
        const { limit, skip } = req.query;
        const { limitValue, skipValue } = parseQuery(limit as string, 10, skip as string);
        const comments = await Comment.aggregate([
            {
                $match: { authorId: new mongoose.Types.ObjectId(req.params.userId) },
            },
            { $sort: { createdAt: -1 } },
            { $limit: skipValue + limitValue },
            { $skip: skipValue },
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
                    likes: 1,
                    likesCount: { $size: "$likes" },
                    createdAt: 1,
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
    getFriendState: async (req: Request, res: Response) => {
        const friendState = await getFriendState(req.params.userId, req.params.friendId);
        res.status(200).json({ friendState });
    },
    getFriendRecommendation: async (req: Request, res: Response) => {
        if (!req.user.userRouteAuthorized) return res.sendStatus(403);
        const { limit, skip } = req.query;
        const { limitValue, skipValue } = parseQuery(limit as string, 10, skip as string);
        const friendRecommendation = await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.params.userId) } },
            { $project: { friend: "$friends", _id: 0 } },
            { $unwind: "$friend" },
            {
                $lookup: {
                    from: "users",
                    localField: "friend",
                    foreignField: "friends",
                    as: "friendFriend",
                    pipeline: [
                        {
                            $match: {
                                _id: {
                                    $ne: new mongoose.Types.ObjectId(req.params.userId),
                                },
                            },
                        },
                        { $project: { _id: 1 } },
                    ],
                },
            },
            { $set: { friendFriend: "$friendFriend._id" } },
            { $unwind: "$friendFriend" },
            {
                $group: {
                    _id: "$_id",
                    friend: { $addToSet: "$friend" },
                    friendFriend: { $push: "$friendFriend" },
                },
            },
            { $unwind: "$friendFriend" },
            {
                $match: {
                    $expr: {
                        $not: { $in: ["$friendFriend", "$friend"] },
                    },
                },
            },
            { $group: { _id: "$friendFriend", mutualFriends: { $sum: 1 } } },
            { $match: { _id: { $ne: null } } },
            { $sort: { mutualFriends: -1 } },
            { $project: { mutualFriends: 1 } },
            { $limit: skipValue + limitValue },
            { $skip: skipValue },
        ]);
        return res.status(200).json({ friendRecommendation });
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
    deleteSentFriendRequest: async (req: Request, res: Response) => {
        if (!req.user.userRouteAuthorized) {
            return res.sendStatus(403);
        }
        const result = await User.updateOne(
            {
                _id: req.params.friendId,
            },
            {
                $pull: {
                    friendRequests: { user: req.params.userId },
                },
            }
        );
        if (result.modifiedCount === 0) return res.sendStatus(404);
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
        interface friendI {
            _id: string;
            friendState: string;
            _doc: friendI;
        }
        interface query {
            friends: Array<friendI>;
        }
        const { friends }: query = await User.findById(req.params.userId, {
            friends: 1,
        }).populate("friends", { _id: 1, firstName: 1, lastName: 1, imageMini: 1 });
        const map = async (friend: friendI, done: (arg0: null, arg1: friendI) => void) => {
            const friendState = await getFriendState(req.user.id, friend._id);

            done(null, { ...friend._doc, friendState });
        };

        const friendsWithState = await async.map(friends, map);
        return res.status(200).json({
            friends: friendsWithState,
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
async function getFriendState(userId: String, friendId: String) {
    let friendState: string;
    const [friend, friendRequestReceived, friendRequestSent] = await Promise.all([
        User.findOne({ _id: userId, friends: friendId }).count(),
        User.findOne({ _id: userId, "friendRequests.user": friendId }),
        User.findOne({
            _id: friendId,
            "friendRequests.user": userId,
        }),
    ]);
    if (friend) friendState = "FRIEND";
    else if (friendRequestReceived) friendState = "FRIEND_REQUEST_RECEIVED";
    else if (friendRequestSent) friendState = "FRIEND_REQUEST_SENT";
    else friendState = "NOT_FRIEND";
    return friendState;
}
export default userController;
