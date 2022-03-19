import mongoose from "mongoose";
import Comment from "./Comment";
const Schema = mongoose.Schema;
const Post = new Schema(
    {
        authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true },
        image: { data: Buffer, contentType: String },
        likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);
Post.pre("deleteOne", { document: false, query: true }, async function (next) {
    const postDeleted = await this.model.findOne(this.getFilter(), { _id: 1 });
    await Comment.deleteMany({ postId: postDeleted._id });
    next();
});
Post.pre("deleteMany", { document: false, query: true }, async function (next) {
    const postsDeleted = await this.model.find(this.getFilter(), { _id: 1 });
    const postIds = postsDeleted.map((post) => post._id);
    await Comment.deleteMany({ postId: { $in: postIds } });
    next();
});
export default mongoose.model("Post", Post);
