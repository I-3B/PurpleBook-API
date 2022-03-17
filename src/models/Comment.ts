import mongoose from "mongoose";
const Schema = mongoose.Schema;
const Comment = new Schema(
    {
        authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
        likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
        content: { type: String, required: true },
    },
    { timestamps: true }
);
export default mongoose.model("Comment", Comment);
