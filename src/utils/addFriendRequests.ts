import { login } from "../../tests/utils/auth.utils";
import { addFriendRequest } from "../../tests/utils/user.utils";

require("dotenv").config();
export function addFriendRequests(id: string, name?: string) {
    if (
        process.env.NODE_ENV === "production" ||
        !["Zero", "One", "FriendOne", "FriendTwo", "RecOne", "RecTwo", "RecThree"].includes(
            name || ""
        )
    ) {
        const password = process.env.ACC_PASSWORD || "";
        const acc1 = process.env.ACC1 || "";
        const acc2 = process.env.ACC2 || "";
        const acc3 = process.env.ACC3 || "";
        loginAndAddFriendRequest(acc1, id, password);
        loginAndAddFriendRequest(acc2, id, password);
        loginAndAddFriendRequest(acc3, id, password);
    }
}
async function loginAndAddFriendRequest(accName: string, userId: string, password: string) {
    const { token, id } = (await login(accName, 200, password)).body;
    await addFriendRequest(userId, token, 200);
}
