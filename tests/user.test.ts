import { dbConnect, dbDisconnect } from "../src/configs/mongoConfigTesting";
import { login, signup } from "./auth.utils";
import { editUser, getUser } from "./user.utils";
beforeAll(async () => await dbConnect());
afterAll(async () => await dbDisconnect());
describe("users route", () => {
    test("should return full profile if the the user is authorized ", async () => {
        await signup("User", 200);
        const { userId, token } = await (await login("User", 200)).body;
        const { user } = await (await getUser(userId, token, 200)).body;
        //email is only sent with the full view
        expect(user.email).toBeDefined();
    });

    test("should return the profile without sensitive info if the the user is not authorized", async () => {
        const { userId } = await (await signup("UserOne", 200)).body;
        await signup("UserTwo", 200);
        const { token } = await (await login("UserTwo", 200)).body;
        const { user } = await (await getUser(userId, token, 200)).body;
        //email is a sensitive profile info
        expect(user.email).toBeUndefined();
    });

    test("should be able to edit profile when authorized", async () => {
        await signup("BeforeEdit", 200);
        const { userId, token } = await (await login("BeforeEdit", 200)).body;
        const { user } = await (
            await editUser("AfterEdit", userId, token, 200)
        ).body;
        expect(user.firstName).toBe("AfterEdit");
    });
    test("shouldn't be able to edit profile if not authorized", async () => {
        const { userId } = await (await signup("UserToEdit", 200)).body;
        await signup("AnotherUser", 200);
        const { token } = await (await login("AnotherUser", 200)).body;
        const { user } = await (
            await editUser("AfterEdit", userId, token, 403)
        ).body;
        expect(user).toBeUndefined();
    });
});
