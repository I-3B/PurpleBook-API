import mongoose from "mongoose";
const Schema = mongoose.Schema;
const Comment = new Schema({
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    content: { type: String, required: true },
});
export default mongoose.model("Comment", Comment);
