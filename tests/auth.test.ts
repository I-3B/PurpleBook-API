import request from "supertest";
import init from "../src/configs/mongoConfigTesting";
import app from "./app";
beforeAll(async () => await init());
describe("auth route works", () => {
    const user = {
        firstName: "first",
        lastName: "last",
        email: "example@email.com",
        password: "12345678",
    };
    test("new user signup should work", async () => {
        await request(app)
            .post("/api/auth/signup")
            .field("firstName", user.firstName)
            .field("lastName", user.lastName)
            .field("email", user.email)
            .field("password", user.password)
            .expect(200);
    });
    test("should reject duplicate email", async () => {
        await request(app)
            .post("/api/auth/signup")
            .field("firstName", user.firstName)
            .field("lastName", user.lastName)
            .field("email", user.email)
            .field("password", user.password)
            .expect(400);
    });
    test("login should work", async () => {
        await request(app)
            .post("/api/auth/login")
            .send({ email: user.email, password: user.password })
            .expect(200);
    });
    test("login should fail", async () => {
        await request(app)
            .post("/api/auth/login")
            .send({ email: user.email, password: "wrong password" });
    });
});
