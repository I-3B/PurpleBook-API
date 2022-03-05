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
    isAdmin: Boolean,
});
export default mongoose.model("User", User);
