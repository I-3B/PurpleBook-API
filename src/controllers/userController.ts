import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User";

const userController = {
    //send user's full profile if the requester is the user
    //else it will send the profile without sensitive data
    getUser: async (req: Request, res: Response) => {
        let user;
        if (req.user?.isAuthorized) {
            user = await User.findById(req.params.userId, {
                password: 0,
            });
        } else {
            user = await User.findById(req.params.userId, {
                firstName: 1,
                lastName: 1,
                profilePicture: 1,
                posts: 1,
                friends: 1,
            });
        }
        if (user) {
            return res.status(200).json({ statusBool: true, message: "User found", user: user });
        }
        return res.status(404).json({ statusBool: false, message: "User not found" });
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
            if (!req.user?.isAuthorized)
                return res.status(403).json({
                    statusBool: false,
                    message: "You are not authorized to edit this user",
                });
            const errors = validationResult(req);
            const files = req.files as Express.Multer.File[];
            const profilePicture = files[0] ? files[0] : { buffer: "", mimetype: "" };
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    statusBool: false,
                    message: "update failed",
                    errors: [...errors.array()],
                });
            } else {
                const user = await User.findByIdAndUpdate(
                    req.user?.id,
                    {
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        profilePicture: {
                            data: profilePicture.buffer,
                            contentType: profilePicture.mimetype,
                        },
                    },
                    {
                        new: true,
                        fields: {
                            firstName: 1,
                            lastName: 1,
                            profilePicture: 1,
                        },
                    }
                );
                if (user)
                    return res.status(200).json({
                        statusBool: true,
                        message: "update succeeded",
                        user: user,
                    });
            }
        },
    ],
    deleteUser: async (req: Request, res: Response) => {
        if (!req.user?.isAuthorized) {
            return res.status(403).json({
                statusBool: false,
                message: "you are not authorized to delete this user",
            });
        }
        const result = await User.deleteOne({
            _id: req.params.userId,
        });
        if (result?.deletedCount == 1) {
            return res.status(200).json({
                statusBool: true,
                message: "user deleted",
            });
        } else {
            return res.status(500).json({
                statusBool: false,
                message: "something went wrong :(",
            });
        }
    },
    getFriendRequests: async (req: Request, res: Response) => {
        if (!req.user?.isAuthorized) {
            return res.status(403).json({
                statusBool: false,
                message: "you are not authorized to view this user's friend requests",
            });
        }
        const { friendRequests } = await User.findById(req.params.userId, {
            friendRequests: 1,
        });
        return res.status(200).json({
            statusBool: true,
            message: "pending friend requests",
            friendRequests: friendRequests,
        });
    },
    addFriendRequest: async (req: Request, res: Response) => {
        if (req.user?.id === req.params.userId) {
            return res.status(400).json({
                statusBool: false,
                message: "You are sending a friend request to yourself... man this is just sad",
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
                statusBool: false,
                message: "user is already a friend",
            });
        else if (!userExist) {
            return res.status(404).json({
                statusBool: false,
                message:
                    "the user requested is not found, maybe the account got deleted or it never existed at all",
            });
        } else {
            const result = await User.updateOne(
                {
                    _id: req.params.userId,
                    friendRequests: {
                        $not: { $elemMatch: { userId: req.user?.id } },
                    },
                },
                {
                    $push: {
                        friendRequests: {
                            userId: req.user?.id,
                            viewed: false,
                        },
                    },
                }
            );
            //user is not in friends array?
            if (result?.matchedCount == 1) {
                return res.status(200).json({
                    statusBool: true,
                    message: "friend request added",
                });
            } else if (result?.matchedCount == 0) {
                return res.status(400).json({
                    statusBool: false,
                    message: "already sent a friend request",
                });
            }
        }
    },

    setFriendRequestsAsViewed: async (req: Request, res: Response) => {
        if (!req.user?.isAuthorized) {
            return res.status(403).json({
                statusBool: false,
                message: "You are not authorized to edit this user's friend requests",
            });
        }
        await User.updateOne(
            { _id: req.params.userId, "friendRequests.viewed": false },
            {
                $set: { "friendRequests.$.viewed": true },
            }
        );
        return res.status(200).json({
            statusBool: false,
            message: "friend requests all set to viewed",
        });
    },
    acceptFriendRequest: async (req: Request, res: Response) => {
        if (!req.user?.isAuthorized) {
            return res.status(403).json({
                statusBool: false,
                message: "You are not authorized to accept another user's friend requests",
            });
        }
        const userDeletedFromFriendRequests = await User.updateOne(
            {
                _id: req.user.id,
            },
            {
                $pull: {
                    friendRequests: { userId: req.params.friendId },
                },
            }
        );
        if (userDeletedFromFriendRequests.modifiedCount === 0) {
            return res.status(400).json({
                statusBool: false,
                message: "User is not found in friend requests",
            });
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
        return res.status(200).json({
            statusBool: true,
            message: "Friend request accepted",
        });
    },
    getFriends: async (req: Request, res: Response) => {
        const { friends } = await User.findById(req.params.userId, {
            friends: 1,
        });
        return res.status(200).json({
            statusBool: true,
            message: "User's friends list",
            friends: friends,
        });
    },
    deleteFriend: async (req: Request, res: Response) => {
        if (!req.user?.isAuthorized) {
            return res.status(403).json({
                statusBool: false,
                message: "you are not authorized to remove other user's friend",
            });
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
        return res.status(200).json({
            statusBool: true,
            message: "Friend removed",
        });
    },
};

export default userController;
