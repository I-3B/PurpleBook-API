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
        postsLiked: [{ type: Schema.Types.ObjectId, ref: "Post" }],
        commentsLiked: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
        friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
        friendRequests: [
            {
                userId: { type: Schema.Types.ObjectId, ref: "User" },
                viewed: Boolean,
            },
        ],
        isAdmin: Boolean,
    },
    { timestamps: true }
);
User.pre("deleteOne", { document: false, query: true }, async function () {
    const deletedUser = await this.model.findOne(this.getFilter());
    await Promise.all([
        Post.deleteMany({ authorId: deletedUser._id }),
        Comment.deleteMany({ authorId: deletedUser._id }),
        this.model.updateMany(
            {
                friendRequests: {
                    $elemMatch: { userId: deletedUser._id },
                },
            },
            {
                $pull: {
                    friendRequests: {
                        userId: deletedUser._id,
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
    ]);
});

export default mongoose.model("User", User);
