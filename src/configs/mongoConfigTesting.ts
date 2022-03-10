const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const dbConnect = async () => {
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    mongoose.connect(mongoUri);

    mongoose.connection.on("error", (e: { message: { code: string } }) => {
        if (e.message.code === "ETIMEDOUT") {
            console.log(e);
            mongoose.connect(mongoUri);
        }
        console.log(e);
    });

    mongoose.connection.once("open", () => {
        // console.log(`MongoDB successfully connected to ${mongoUri}`);
    });
};
const dbDisconnect = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
};
export { dbConnect, dbDisconnect };
