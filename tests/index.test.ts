import request from "supertest";
import app from "./app";
const init = require("./mongoConfigTesting");
beforeAll(async () => await init());
test("index route works", async () => {
    await request(app).get("/api/test").expect({ message: "World!" });
});
