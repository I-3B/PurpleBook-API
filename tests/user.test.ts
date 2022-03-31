import { clearDB, dbConnect, dbDisconnect } from "../src/configs/mongoConfigTesting";
import User from "../src/models/User";
import { login, signup, signupWithImage } from "./utils/auth.utils";
import { addComment, addLikeToComment } from "./utils/comment.utils";
import { getNotifications } from "./utils/notification.utils";
import { addLikeToPost, addPost } from "./utils/post.utils";
import {
    acceptFriendRequest,
    addFriendRequest,
    deleteFriend,
    deleteFriendRequest,
    deleteUser,
    editUser,
    editUserWithImage,
    getFriendRequests,
    getFriends,
    getUser,
    getUserComments,
    getUserPosts,
    setFriendRequestsAsViewed,
} from "./utils/user.utils";
beforeAll(async () => await dbConnect());
beforeEach(async () => await clearDB());
afterAll(async () => await dbDisconnect());
describe("users route", () => {
    describe("getUser", () => {
        test("should return users data", async () => {
            const { userId } = (await signup("UserOne", 201)).body;
            await signup("UserTwo", 201);
            const { token } = (await login("UserTwo", 200)).body;

            const { user } = (await getUser(userId, token, 200)).body;

            expect(user.firstName).toBe("UserOne");
        });
    });

    describe("editUser", () => {
        test("should be able to edit profile when authorized", async () => {
            await signup("BeforeEdit", 201);
            const { userId, token } = (await login("BeforeEdit", 200)).body;

            const { user } = (await editUser("AfterEdit", userId, token, 200)).body;
            expect(user.firstName).toBe("AfterEdit");
        });

        test("shouldn't be able to edit profile if not authorized", async () => {
            const { userId } = (await signup("UserToEdit", 201)).body;
            await signup("AnotherUser", 201);
            const { token } = (await login("AnotherUser", 200)).body;

            const { user } = (await editUser("AfterEdit", userId, token, 403)).body;
            expect(user).toBeUndefined();
        });

        test("editing user with image should work", async () => {
            await signup("User", 201);
            const { token, userId } = (await login("User", 200)).body;

            let user = await User.findOne({ firstName: "User" });

            expect(user.imageMini.data.length).toBe(0);

            await editUserWithImage("edited", userId, token, "/images/profilePicture.png", 200);

            user = await User.findOne({ firstName: "edited" });

            expect(user.imageMini.data.length).toBeGreaterThan(0);
        });

        test("editing user without uploading new image should not remove the old one", async () => {
            await signupWithImage("User", "/images/profilePicture.png", 201);
            const { token, userId } = (await login("User", 200)).body;

            await editUser("edited", userId, token, 200);
            const user = await User.findOne({ firstName: "edited" });
            expect(user.imageMini.data.length).toBeGreaterThan(0);
        });
    });
    describe("deleteUser", () => {
        test("should be able to delete user if authorized", async () => {
            await signup("UserToDelete", 201);
            const { userId, token } = (await login("UserToDelete", 200)).body;

            await deleteUser(userId, token, 200);

            //login with another User because the previous token is now invalid
            await signup("CheckDelete", 201);
            const { token: newToken } = (await login("CheckDelete", 200)).body;

            await getUser(userId, newToken, 404);
        });

        test("should not be able to delete user if not authorized", async () => {
            const { userId } = (await signup("UserToDeleteTwo", 201)).body;
            await signup("WantToDelete", 201);
            const { token } = (await login("WantToDelete", 200)).body;

            await deleteUser(userId, token, 403);
        });

        test("deleting a user should remove him from another users friend requests", async () => {
            await signup("toBeDeleted", 201);
            const { userId: deletedId, token: deletedToken } = (await login("toBeDeleted", 200))
                .body;
            await signup("FRReceiver", 201);
            const { userId: FRId, token: FRToken } = (await login("FRReceiver", 200)).body;

            await addFriendRequest(FRId, deletedToken, 200);

            await deleteUser(deletedId, deletedToken, 200);

            const { friendRequests } = (await getFriendRequests(FRId, FRToken, 200)).body;
            expect(friendRequests.length).toBe(0);
        });

        test("deleting a user should unfriend him from other users", async () => {
            await signup("deleted", 201);
            const { userId: deletedId, token: deletedToken } = (await login("deleted", 200)).body;
            await signup("friend", 201);
            const { userId: friendId, token: friendToken } = (await login("friend", 200)).body;

            await addFriendRequest(deletedId, friendToken, 200);
            await acceptFriendRequest(deletedId, deletedToken, friendId, 200);

            await deleteUser(deletedId, deletedToken, 200);

            const { friends } = (await getFriends(friendId, friendToken, 200)).body;
            expect(friends).not.toContainEqual(deletedId);
        });

        test("deleting a user should remove all his posts", async () => {
            await signup("User", 201);
            await signup("AnotherUser", 201);
            const { userId, token } = (await login("User", 200)).body;
            const anotherUser = (await login("AnotherUser", 200)).body;
            await addPost(token, 1, 201);

            await deleteUser(userId, token, 200);
            const { posts } = (await getUserPosts(userId, anotherUser.token, 200)).body;

            expect(posts.length).toBe(0);
        });

        test("deleting a user should remove all his comments", async () => {
            await signup("User", 201);
            await signup("AnotherUser", 201);
            const { userId, token } = (await login("User", 200)).body;
            const anotherUser = (await login("AnotherUser", 200)).body;

            const { postId } = (await addPost(anotherUser.token, 1, 201)).body;
            await addComment(token, postId, 1, 201);

            await deleteUser(userId, token, 200);
            const { posts } = (await getUserPosts(anotherUser.userId, anotherUser.token, 200)).body;
            const { comments } = (await getUserComments(anotherUser.userId, anotherUser.token, 200))
                .body;
            expect(posts.length).toBe(1);
            expect(comments.length).toBe(0);
        });

        test("deleting a user should remove his likes from all posts", async () => {
            await signup("User", 201);
            await signup("AnotherUser", 201);
            const { userId, token } = (await login("User", 200)).body;
            const anotherUser = (await login("AnotherUser", 200)).body;

            const { postId } = (await addPost(anotherUser.token, 1, 201)).body;
            await addLikeToPost(token, postId, 200);

            await deleteUser(userId, token, 200);

            const { posts } = (await getUserPosts(anotherUser.userId, anotherUser.token, 200)).body;

            expect(posts[0].likesCount).toBe(0);
        });

        test("deleting a user should remove his likes from comments", async () => {
            await signup("User", 201);
            await signup("AnotherUser", 201);
            const { userId, token } = (await login("User", 200)).body;
            const anotherUser = (await login("AnotherUser", 200)).body;

            const { postId } = (await addPost(anotherUser.token, 1, 201)).body;
            const { commentId } = (await addComment(anotherUser.token, postId, 1, 201)).body;
            await addLikeToComment(token, postId, commentId, 200);

            await deleteUser(userId, token, 200);

            const { posts } = (await getUserPosts(anotherUser.userId, anotherUser.token, 200)).body;
            const { comments } = (await getUserComments(anotherUser.userId, anotherUser.token, 200))
                .body;

            expect(posts[0].commentsCount).toBe(1);
            expect(comments[0].likesCount).toBe(0);
        });
    });
    describe("getPosts", () => {
        test("should retrieve users posts", async () => {
            await signup("User", 201);
            const { userId, token } = (await login("User", 200)).body;
            await addPost(token, 1, 201);

            const { posts } = (await getUserPosts(userId, token, 200)).body;
            expect(posts[0].content).toBe("a");
        });

        test("should return correct likes count", async () => {
            await signup("User", 201);
            const { userId, token } = (await login("User", 200)).body;
            const { postId } = (await addPost(token, 1, 201)).body;
            await addLikeToPost(token, postId, 200);
            const { posts } = (await getUserPosts(userId, token, 200)).body;
            expect(posts[0].likesCount).toBe(1);
        });

        test("should return correct comments count", async () => {
            await signup("User", 201);
            const { userId, token } = (await login("User", 200)).body;
            const { postId } = (await addPost(token, 1, 201)).body;
            await addComment(token, postId, 1, 201);
            await addComment(token, postId, 1, 201);

            const { posts } = (await getUserPosts(userId, token, 200)).body;
            expect(posts[0].commentsCount).toBe(2);
        });

        test("likedByUser should work", async () => {
            await signup("User", 201);
            await signup("AnotherUser", 201);
            const { userId, token } = (await login("User", 200)).body;
            const anotherUser = (await login("AnotherUser", 200)).body;

            const { postId } = (await addPost(token, 1, 201)).body;
            await addLikeToPost(token, postId, 200);

            const { posts } = (await getUserPosts(userId, token, 200)).body;
            const { posts: anotherUserPostView } = (
                await getUserPosts(userId, anotherUser.token, 200)
            ).body;

            expect(posts[0].likedByUser).toBe(true);
            expect(anotherUserPostView[0].likedByUser).toBe(false);
        });
    });
    describe("getComments", () => {
        test("should retrieve users comments", async () => {
            await signup("User", 201);
            const { userId, token } = (await login("User", 200)).body;

            const { postId } = (await addPost(token, 100, 201)).body;
            await addComment(token, postId, 5, 201);

            const { comments } = (await getUserComments(userId, token, 200)).body;

            expect(comments[0].post.contentPreview).toBe("a".repeat(60));
            expect(comments[0].post.postAuthorFirstName).toBe("User");
        });
    });
    describe("getFriendRequests", () => {
        test("user should be able to view their friend requests", async () => {
            await signup("UserOwnFR", 201);
            await signup("Sender", 201);
            const { userId: receiverId, token: receiverToken } = (await login("UserOwnFR", 200))
                .body;
            const { token: senderToken } = (await login("Sender", 200)).body;

            await addFriendRequest(receiverId, senderToken, 200);

            const { friendRequests } = (await getFriendRequests(receiverId, receiverToken, 200))
                .body;
            expect(friendRequests).toContainEqual(
                expect.objectContaining({
                    user: expect.objectContaining({ firstName: "Sender" }),
                })
            );
        });

        test("user should not be able to view another user's friend requests", async () => {
            const { userId: friendRequestUserId } = (await signup("UserFriendRequest", 201)).body;
            await signup("UserWantToViewFR", 201);
            const { token: wantToViewToken } = (await login("UserWantToViewFR", 200)).body;

            await getFriendRequests(friendRequestUserId, wantToViewToken, 403);
        });
    });

    describe("addFriendRequest", () => {
        test("user should be able to send a friend request to another user and not to oneself", async () => {
            const { userId: receiverId } = (await signup("UserRequested", 201)).body;
            await signup("UserSending", 201);
            const { token: senderToken, userId: senderId } = (await login("UserSending", 200)).body;

            await addFriendRequest(receiverId, senderToken, 200);
            //login as UserRequested to view the friend request
            const { token: receiverToken } = (await login("UserRequested", 200)).body;
            await addFriendRequest(receiverId, receiverToken, 400);

            const { friendRequests } = (await getFriendRequests(receiverId, receiverToken, 200))
                .body;
            expect(friendRequests).toContainEqual(
                expect.objectContaining({
                    user: expect.objectContaining({ _id: senderId }),
                })
            );
        });

        test("user should not be able to send a friend request twice", async () => {
            const { userId: receiverId } = (await signup("UserRequestedTwice", 201)).body;
            await signup("UserSendingTwice", 201);
            const { token: senderToken } = (await login("UserSendingTwice", 200)).body;

            await addFriendRequest(receiverId, senderToken, 200);
            //send request again
            await addFriendRequest(receiverId, senderToken, 400);
        });

        test("user should not be able to send a friend request to non existent user", async () => {
            await signup("Deleted", 201);
            const { userId: deletedId, token: deletedToken } = (await login("Deleted", 200)).body;
            await deleteUser(deletedId, deletedToken, 200);

            await signup("User", 201);
            const { token } = (await login("User", 200)).body;

            await addFriendRequest(deletedId, token, 404);
        });

        test("expect error to be thrown if userId is incorrect", async () => {
            await signup("User", 201);

            const { token } = (await login("User", 200)).body;
            await addFriendRequest("WRONG_ID", token, 500);
        });

        test("user should not be able to send a friend request to an already friend", async () => {
            await signup("UserOne", 201);
            const { userId: friendId, token: friendToken } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 201);
            const { userId, token } = (await login("UserTwo", 200)).body;

            await addFriendRequest(userId, friendToken, 200);
            await acceptFriendRequest(userId, token, friendId, 200);
            await addFriendRequest(userId, friendToken, 400);
        });
    });

    describe("setFriendRequestsAsViewed", () => {
        test("should be able to set friend requests as viewed", async () => {
            await signup("UserOne", 201);
            const { userId: oneId, token: oneToken } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 201);
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
            await signup("UserOne", 201);
            await signup("UserTwo", 201);
            const { userId } = (await login("UserOne", 200)).body;
            const { token } = (await login("UserTwo", 200)).body;

            await setFriendRequestsAsViewed(userId, token, 403);
        });
    });
    describe("deleteFriendRequest", () => {
        test("should delete friend request when authorized", async () => {
            await signup("UserOne", 201);
            await signup("UserTwo", 201);
            const { userId: receiverId, token: receiverToken } = (await login("UserOne", 200)).body;
            const { userId: senderId, token: senderToken } = (await login("UserTwo", 200)).body;

            await addFriendRequest(receiverId, senderToken, 200);
            await deleteFriendRequest(receiverId, receiverToken, senderId, 200);

            const { friendRequests } = (await getFriendRequests(receiverId, receiverToken, 200))
                .body;

            expect(friendRequests.length).toBe(0);
        });
    });
    describe("acceptFriendRequest", () => {
        test("should be able to accept a friend request", async () => {
            await signup("UserOne", 201);
            const { userId: friendId, token: friendToken } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 201);
            const { userId, token } = (await login("UserTwo", 200)).body;

            await addFriendRequest(userId, friendToken, 200);
            await acceptFriendRequest(userId, token, friendId, 200);
        });

        test("should not be able to accept a friend request if not authorized", async () => {
            await signup("UserOne", 201);
            const { userId: friendId, token: friendToken } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 201);
            const { userId } = (await login("UserTwo", 200)).body;

            await addFriendRequest(userId, friendToken, 200);
            const anotherUserToken = friendToken;
            await acceptFriendRequest(userId, anotherUserToken, friendId, 403);
        });

        test("accepting a friend request should add friend id to user's friend list and likewise", async () => {
            await signup("User", 201);
            const { userId, token } = (await login("User", 200)).body;
            await signup("Friend", 201);
            const { userId: friendId, token: friendToken } = (await login("Friend", 200)).body;

            await addFriendRequest(userId, friendToken, 200);
            await acceptFriendRequest(userId, token, friendId, 200);

            const { friends: userList } = (await getFriends(userId, token, 200)).body;
            const { friends: friendList } = (await getFriends(friendId, friendToken, 200)).body;
            expect(userList).toContainEqual(expect.objectContaining({ _id: friendId }));
            expect(friendList).toContainEqual(expect.objectContaining({ _id: userId }));
        });

        test("accepting friend request should notify the sender", async () => {
            await signup("User", 201);
            const { userId, token } = (await login("User", 200)).body;
            await signup("Friend", 201);
            const { userId: friendId, token: friendToken } = (await login("Friend", 200)).body;

            await addFriendRequest(userId, friendToken, 200);
            await acceptFriendRequest(userId, token, friendId, 200);

            const { notifications } = (await getNotifications(friendToken)).body;

            expect(notifications[0].links).toContainEqual(
                expect.objectContaining({ linkId: userId, ref: "User" })
            );
        });
    });

    describe("deleteFriend", () => {
        test("should be able to unfriend another user", async () => {
            await signup("User", 201);
            const { userId, token } = (await login("User", 200)).body;
            await signup("Friend", 201);
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
            await signup("User", 201);
            const { userId, token } = (await login("User", 200)).body;
            //not a friend
            await deleteFriend(userId, token, "WRONG_ID", 500);
        });
    });
});
