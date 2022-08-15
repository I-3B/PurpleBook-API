import { clearDB, dbConnect, dbDisconnect } from "../src/configs/mongoConfigTesting";
import { login, signup } from "./utils/auth.utils";
import { addComment } from "./utils/comment.utils";
import { getNotifications, setNotificationsAsViewed } from "./utils/notification.utils";
import { addLikeToPost, addPost } from "./utils/post.utils";

let sToken: String;
let sUserId: String;
let rToken: String;
let rUserId;
beforeAll(async () => await dbConnect());
beforeEach(async () => {
    await clearDB();
    await signup("Sender", 201);
    await signup("Receiver", 201);

    let sResponse = (await login("Sender", 200)).body;
    let rResponse = (await login("Receiver", 200)).body;
    sToken = sResponse.token;
    sUserId = sResponse.userId;

    rToken = rResponse.token;
    rUserId = rResponse.userId;
});
afterAll(async () => await dbDisconnect());

describe("notifications route", () => {
    describe("getNotifications", () => {
        test("should return notifications in descending order", async () => {
            const { postId } = (await addPost(rToken, 1, 201)).body;

            await addComment(sToken, postId, 1, 201);
            await addLikeToPost(sToken, postId, 200);

            const { notifications } = (await getNotifications(rToken)).body;

            expect(notifications.length).toBe(2);
            expect(notifications[0].links.length).toBe(2);
            expect(notifications[1].links.length).toBe(3);
        });
    });
    describe("setNotificationsAsViewed", () => {
        test("should work", async () => {
            const { postId } = (await addPost(rToken, 1, 201)).body;

            await addComment(sToken, postId, 1, 201);
            await setNotificationsAsViewed(rToken);
            await addLikeToPost(sToken, postId, 200);

            const { notifications } = (await getNotifications(rToken)).body;

            expect(notifications[0].viewed).toBe(false);
            expect(notifications[1].viewed).toBe(true);
        });
    });
});
