import { clearDB, dbConnect, dbDisconnect } from "../src/configs/mongoConfigTesting";
import { login, signup, signupWithImage } from "./utils/auth.utils";
beforeAll(async () => await dbConnect());
beforeEach(async () => await clearDB());
afterAll(async () => await dbDisconnect());

describe("auth route", () => {
    describe("signup", () => {
        test("new user signup should work", async () => {
            await signup("User", 201);
        });
        test("new user signup should work with image", async () => {
            await signupWithImage("User", "/images/profilePicture.png", 201);
        });
        test("should reject duplicate email", async () => {
            await signup("User", 201);
            await signup("User", 400);
        });
    });
    describe("login", () => {
        test("login should work", async () => {
            await signup("User", 201);
            await login("User", 200);
        });
        test("login should fail if user is not signed up", async () => {
            await login("UserNotSignedUp", 404);
        });
        test("login should fail if password is wrong", async () => {
            await signup("User", 201);
            await login("User", 400, "Wrong password");
        });
    });
});
