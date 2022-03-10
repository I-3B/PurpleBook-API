import mongoose from "mongoose";
const Schema = mongoose.Schema;
const User = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    profilePicture: {
        data: Buffer,
        contentType: String,
    },
    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
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
});
export default mongoose.model("User", User);
