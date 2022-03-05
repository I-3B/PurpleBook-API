import mongoose from "mongoose";
mongoose.connect(
    process.env.MONGO_DB || "" /*,
{
    useNewUrlParser: true,
    useUnifiedTopology: true,
} as ConnectOptions*/
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));
