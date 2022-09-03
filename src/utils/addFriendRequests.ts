import { login } from "../../tests/utils/auth.utils";
import { addFriendRequest } from "../../tests/utils/user.utils";

require("dotenv").config();
export function addFriendRequests(id: string, name?: string) {
    if (process.env.NODE_ENV === "production" && process.env.AUTO_FRIEND_REQUEST === "true") {
        const password = process.env.ACC_PASSWORD;
        const acc1 = process.env.ACC1;
        const acc2 = process.env.ACC2;
        const acc3 = process.env.ACC3;
        if (password) {
            if (acc1) loginAndAddFriendRequest(acc1, id, password);
            if (acc2) loginAndAddFriendRequest(acc2, id, password);
            if (acc3) loginAndAddFriendRequest(acc3, id, password);
        }
    }
}
async function loginAndAddFriendRequest(accName: string, userId: string, password: string) {
    const { token } = (await login(accName, 200, password)).body;
    await addFriendRequest(userId, token, 200);
}
