require("dotenv").config();

import { MongoMemoryReplSet } from "mongodb-memory-server-global";
import mongoose from "mongoose";
if (process.env.NODE_ENV === "prod") {
    mongoose.connect(process.env.MONGO_DB || "");
    const db = mongoose.connection;
    db.on("error", console.error.bind(console, "mongo connection error"));
} else if (process.env.NODE_ENV === "dev") {
    MongoMemoryReplSet.create().then((mongoServer) => {
        const mongoUri = mongoServer.getUri();
        mongoose.connect(mongoUri);

        mongoose.connection.on("error", (e: { message: { code: string } }) => {
            if (e.message.code === "ETIMEDOUT") {
                console.log(e);
                mongoose.connect(mongoUri);
            }
            console.log(e);
        });
    });
}
