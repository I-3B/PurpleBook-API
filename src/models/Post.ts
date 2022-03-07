import mongoose from "mongoose";
const Schema = mongoose.Schema;
const Post = new Schema({
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    content: { type: String, required: true },
    image: { data: Buffer, contentType: String },
});
export default mongoose.model("Post", Post);
