require("dotenv").config();
import mongoose from "mongoose";
mongoose.connect(process.env.MONGO_DB || "");
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));
