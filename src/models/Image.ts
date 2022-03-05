import mongoose from "mongoose";
const Schema = mongoose.Schema;

const imageSchema = new Schema({
    name: String,
    desc: String,
    img: {
        data: Buffer,
        contentType: String,
    },
});

export default mongoose.model("Image", imageSchema);
