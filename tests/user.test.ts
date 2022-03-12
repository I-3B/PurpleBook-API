import { clearDB, dbConnect, dbDisconnect } from "../src/configs/mongoConfigTesting";
import { login, signup } from "./auth.utils";
import {
    acceptFriendRequest,
    addFriendRequest,
    deleteFriend,
    deleteUser,
    editUser,
    getFriendRequests,
    getFriends,
    getUser,
    setFriendRequestsAsViewed,
} from "./user.utils";
beforeAll(async () => await dbConnect());
beforeEach(async () => await clearDB());
afterAll(async () => await dbDisconnect());
describe("users route", () => {
    describe("getUser", () => {
        test("should return full profile if the the user is authorized ", async () => {
            await signup("User", 200);
            const { userId, token } = (await login("User", 200)).body;

            const { user } = (await getUser(userId, token, 200)).body;
            //email is only sent with the full view
            expect(user.email).toBeDefined();
        });

        test("should return the profile without sensitive info if the the user is not authorized", async () => {
            const { userId } = (await signup("UserOne", 200)).body;
            await signup("UserTwo", 200);
            const { token } = (await login("UserTwo", 200)).body;

            const { user } = (await getUser(userId, token, 200)).body;
            //email is a sensitive profile info
            expect(user.email).toBeUndefined();
        });
    });

    describe("editUser", () => {
        test("should be able to edit profile when authorized", async () => {
            await signup("BeforeEdit", 200);
            const { userId, token } = (await login("BeforeEdit", 200)).body;

            const { user } = (await editUser("AfterEdit", userId, token, 200)).body;
            expect(user.firstName).toBe("AfterEdit");
        });
        test("shouldn't be able to edit profile if not authorized", async () => {
            const { userId } = (await signup("UserToEdit", 200)).body;
            await signup("AnotherUser", 200);
            const { token } = (await login("AnotherUser", 200)).body;

            const { user } = (await editUser("AfterEdit", userId, token, 403)).body;
            expect(user).toBeUndefined();
        });
    });
    describe("deleteUser", () => {
        test("should be able to delete user if authorized", async () => {
            await signup("UserToDelete", 200);
            const { userId, token } = (await login("UserToDelete", 200)).body;

            await deleteUser(userId, token, 200);

            //login with another User because the previous token is now invalid
            await signup("CheckDelete", 200);
            const { token: newToken } = (await login("CheckDelete", 200)).body;

            await getUser(userId, newToken, 404);
        });
        test("should not be able to delete user if not authorized", async () => {
            const { userId } = (await signup("UserToDeleteTwo", 200)).body;
            await signup("WantToDelete", 200);
            const { token } = (await login("WantToDelete", 200)).body;

            await deleteUser(userId, token, 403);
        });
    });

    describe("getFriendRequests", () => {
        test("user should be able to view their friend requests", async () => {
            await signup("UserOwnFR", 200);
            const { userId, token } = (await login("UserOwnFR", 200)).body;

            await getFriendRequests(userId, token, 200);
        });
        test("user should not be able to view another user's friend requests", async () => {
            const { userId: friendRequestUserId } = (await signup("UserFriendRequest", 200)).body;
            await signup("UserWantToViewFR", 200);
            const { token: wantToViewToken } = (await login("UserWantToViewFR", 200)).body;

            await getFriendRequests(friendRequestUserId, wantToViewToken, 403);
        });
    });
    describe("addFriendRequest", () => {
        test("user should be able to send a friend request to another user and not to oneself", async () => {
            const { userId: receiverId } = (await signup("UserRequested", 200)).body;
            await signup("UserSending", 200);
            const { token: senderToken, userId: senderId } = (await login("UserSending", 200)).body;

            await addFriendRequest(receiverId, senderToken, 200);
            //login as UserRequested to view the friend request
            const { token: receiverToken } = (await login("UserRequested", 200)).body;
            await addFriendRequest(receiverId, receiverToken, 400);

            const { friendRequests } = (await getFriendRequests(receiverId, receiverToken, 200))
                .body;
            expect(friendRequests).toContainEqual(
                expect.objectContaining({
                    userId: senderId,
                })
            );
        });
        test("user should not be able to send a friend request twice", async () => {
            const { userId: receiverId } = (await signup("UserRequestedTwice", 200)).body;
            await signup("UserSendingTwice", 200);
            const { token: senderToken } = (await login("UserSendingTwice", 200)).body;

            await addFriendRequest(receiverId, senderToken, 200);
            //send request again
            await addFriendRequest(receiverId, senderToken, 400);
        });
        test("user should not be able to send a friend request to non existent user", async () => {
            await signup("Deleted", 200);
            const { userId: deletedId, token: deletedToken } = (await login("Deleted", 200)).body;
            await deleteUser(deletedId, deletedToken, 200);

            await signup("User", 200);
            const { token } = (await login("User", 200)).body;

            await addFriendRequest(deletedId, token, 404);
        });
        test("expect error to be thrown if userId is incorrect", async () => {
            await signup("User", 200);

            const { token } = (await login("User", 200)).body;
            await addFriendRequest("WRONG_ID", token, 500);
        });
        test("user should not be able to send a friend request to an already friend", async () => {
            await signup("UserOne", 200);
            const { userId: friendId, token: friendToken } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 200);
            const { userId, token } = (await login("UserTwo", 200)).body;

            addFriendRequest(userId, friendToken, 200);
            acceptFriendRequest(userId, token, friendId, 200);
            addFriendRequest(userId, friendToken, 400);
        });
    });
    describe("setFriendRequestsAsViewed", () => {
        test("should be able to set friend requests as viewed", async () => {
            await signup("UserOne", 200);
            const { userId: oneId, token: oneToken } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 200);
            const { token: twoToken } = (await login("UserTwo", 200)).body;

            await addFriendRequest(oneId, twoToken, 200);
            await setFriendRequestsAsViewed(oneId, oneToken, 200);

            const { friendRequests } = (await getFriendRequests(oneId, oneToken, 200)).body;
            expect(friendRequests).toContainEqual(
                expect.objectContaining({
                    viewed: true,
                })
            );
        });
        test("should not be able to set friend requests as viewed when not authorized", async () => {
            await signup("UserOne", 200);
            const { userId } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 200);
            const { token } = (await login("UserTwo", 200)).body;

            await setFriendRequestsAsViewed(userId, token, 403);
        });
    });
    describe("acceptFriendRequest", () => {
        test("should be able to accept a friend request", async () => {
            await signup("UserOne", 200);
            const { userId: friendId, token: friendToken } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 200);
            const { userId, token } = (await login("UserTwo", 200)).body;

            addFriendRequest(userId, friendToken, 200);
            acceptFriendRequest(userId, token, friendId, 200);
        });
        test("should not be able to accept a friend request if not authorized", async () => {
            await signup("UserOne", 200);
            const { userId: friendId, token: friendToken } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 200);
            const { userId } = (await login("UserTwo", 200)).body;

            addFriendRequest(userId, friendToken, 200);
            const anotherUserToken = friendToken;
            acceptFriendRequest(userId, anotherUserToken, friendId, 403);
        });
        test("should not be able to accept a non existent friend request", async () => {
            await signup("UserOne", 200);
            const { userId: friendId, token: friendToken } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 200);
            const { userId, token } = (await login("UserTwo", 200)).body;

            addFriendRequest(userId, friendToken, 200);
            acceptFriendRequest(userId, token, friendId, 200);
            acceptFriendRequest(userId, token, friendId, 400);
        });
        test("accepting a friend request should add friend id to user's friend list and likewise", async () => {
            await signup("User", 200);
            const { userId, token } = (await login("User", 200)).body;
            await signup("Friend", 200);
            const { userId: friendId, token: friendToken } = (await login("Friend", 200)).body;

            await addFriendRequest(userId, friendToken, 200);
            await acceptFriendRequest(userId, token, friendId, 200);

            const { friends: userList } = (await getFriends(userId, token, 200)).body;
            const { friends: friendList } = (await getFriends(friendId, friendToken, 200)).body;
            expect(userList).toContainEqual(friendId);
            expect(friendList).toContainEqual(userId);
        });
    });
    describe("deleteFriend", () => {
        test("should be able to unfriend another user", async () => {
            await signup("User", 200);
            const { userId, token } = (await login("User", 200)).body;
            await signup("Friend", 200);
            const { userId: friendId, token: friendToken } = (await login("Friend", 200)).body;

            await addFriendRequest(userId, friendToken, 200);
            await acceptFriendRequest(userId, token, friendId, 200);
            await deleteFriend(userId, token, friendId, 200);

            const { friends: userList } = (await getFriends(userId, token, 200)).body;
            const { friends: friendList } = (await getFriends(friendId, friendToken, 200)).body;
            expect(userList).not.toContainEqual(friendId);
            expect(friendList).not.toContainEqual(userId);
        });
        test("should throw error if friendId is in wrong form", async () => {
            await signup("User", 200);
            const { userId, token } = (await login("User", 200)).body;
            //not a friend
            await deleteFriend(userId, token, "WRONG_ID", 500);
        });
    });
});
