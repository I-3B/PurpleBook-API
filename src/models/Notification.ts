import mongoose from "mongoose";
const Schema = mongoose.Schema;
const Notification = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        links: [{ type: { linkId: Schema.Types.ObjectId, ref: String }, required: true }],
        content: { type: String, required: true },
        viewed: { type: Boolean, default: false },
    },
    { timestamps: true }
);
export default mongoose.model("Notification", Notification);
