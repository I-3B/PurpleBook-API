import mongoose from "mongoose";
import Comment from "./Comment";
import Post from "./Post";
const Schema = mongoose.Schema;
const User = new Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        password: { type: String, required: true },
        imageMini: {
            data: Buffer,
            contentType: String,
        },
        imageFull: {
            data: Buffer,
            contentType: String,
        },
        friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
        friendRequests: [
            {
                user: { type: Schema.Types.ObjectId, ref: "User" },
                viewed: Boolean,
            },
        ],
        isAdmin: { type: Boolean, default: false },
    },
    { timestamps: true }
);
User.pre("deleteOne", { document: false, query: true }, async function () {
    //when user is deleted:
    //delete all his posts and comments
    //remove him from other users friend lists and remove his friend requests
    //remove all his likes on posts and comments
    const deletedUser = await this.model.findOne(this.getFilter());
    await Promise.all([
        Post.deleteMany({ authorId: deletedUser._id }),
        Comment.deleteMany({ authorId: deletedUser._id }),
        this.model.updateMany(
            {
                friendRequests: {
                    $elemMatch: { user: deletedUser._id },
                },
            },
            {
                $pull: {
                    friendRequests: {
                        user: deletedUser._id,
                    },
                },
            }
        ),
        this.model.updateMany(
            {
                friends: deletedUser._id,
            },
            {
                $pull: {
                    friends: deletedUser._id,
                },
            }
        ),
        Post.updateMany(
            { likes: deletedUser._id },
            {
                $pull: {
                    likes: deletedUser._id,
                },
            }
        ),
        Comment.updateMany(
            { likes: deletedUser._id },
            {
                $pull: {
                    likes: deletedUser._id,
                },
            }
        ),
    ]);
});

export default mongoose.model("User", User);
