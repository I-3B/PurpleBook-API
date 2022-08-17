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
    getFriendRecommendation,
    getFriendRequests,
    getFriends,
    getFriendState,
    getUser,
    getUserComments,
    getUserHomeData,
    getUserPosts,
    setAdmin,
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

            await editUserWithImage("edited", userId, token, "./images/profile.png", 200);

            user = await User.findOne({ firstName: "edited" });

            expect(user.imageMini.data.length).toBeGreaterThan(0);
        });

        test("editing user without uploading new image should not remove the old one", async () => {
            await signupWithImage("User", "./images/profile.png", 201);
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
        test("should be able to delete user if admin", async () => {
            const { userId } = (await signup("UserToDeleteTwo", 201)).body;
            await signup("WantToDelete", 201);
            const { userId: uId, token } = (await login("WantToDelete", 200)).body;
            await setAdmin(uId, token, 200, "grant=" + process.env.ADMIN_PASSWORD);

            await deleteUser(userId, token, 200);
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

        test("limit and skip should work", async () => {
            await signup("User", 201);
            const { userId, token } = (await login("User", 200)).body;
            for (let i = 1; i <= 20; i++) {
                await addPost(token, i, 201);
            }
            const { posts } = (await getUserPosts(userId, token, 200, "limit=5&skip=5")).body;
            //limit = 5
            expect(posts.length).toBe(5);
            //skip = 5: 20 19 18 17 16 should show 15 after five skips
            expect(posts[0].content.length).toBe(15);
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

    describe("getFriendState", () => {
        let user: { token: string; userId: string };
        let friend: { token: string; userId: string };
        beforeEach(async () => {
            await signup("user", 201);
            await signup("friend", 201);
            user = (await login("user", 200)).body;
            friend = (await login("friend", 200)).body;
        });

        test("should return NOT_FRIEND", async () => {
            const { friendState } = (
                await getFriendState(user.userId, user.token, friend.userId, 200)
            ).body;
            expect(friendState).toBe("NOT_FRIEND");
        });

        test("should return FRIEND_REQUEST_SENT", async () => {
            await addFriendRequest(friend.userId, user.token, 200);
            const { friendState } = (
                await getFriendState(user.userId, user.token, friend.userId, 200)
            ).body;
            expect(friendState).toBe("FRIEND_REQUEST_SENT");
        });

        test("should return FRIEND_REQUEST_RECEIVED", async () => {
            await addFriendRequest(user.userId, friend.token, 200);
            const { friendState } = (
                await getFriendState(user.userId, user.token, friend.userId, 200)
            ).body;
            expect(friendState).toBe("FRIEND_REQUEST_RECEIVED");
        });

        test("should return FRIEND", async () => {
            await addFriendRequest(friend.userId, user.token, 200);
            await acceptFriendRequest(user.userId, user.token, friend.userId, 200);
            const { friendState } = (
                await getFriendState(user.userId, user.token, friend.userId, 200)
            ).body;
            expect(friendState).toBe("FRIEND");
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

        test("should show not viewed friend requests first", async () => {
            await signup("User", 201);
            await signup("FriendOne", 201);
            await signup("FriendTwo", 201);
            const { userId: uId, token: uToken } = (await login("User", 200)).body;
            const { token: f1Token } = (await login("FriendOne", 200)).body;
            const { token: f2Token } = (await login("FriendTwo", 200)).body;

            await addFriendRequest(uId, f1Token, 200);
            await setFriendRequestsAsViewed(uId, uToken, 200);
            await addFriendRequest(uId, f2Token, 200);

            const { friendRequests } = (await getFriendRequests(uId, uToken, 200)).body;
            expect(friendRequests[0].viewed).toBe(false);
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
    describe("getFriends", () => {
        test("friends array should have friendState for viewer", async () => {
            await signup("Viewer", 201);
            await signup("User", 201);
            await signup("Friend", 201);
            const viewer = (await login("Viewer", 200)).body;
            const user = (await login("User", 200)).body;
            const friend = (await login("Friend", 200)).body;

            await addFriendRequest(friend.userId, user.token, 200);
            await acceptFriendRequest(friend.userId, friend.token, user.userId, 200);

            const { friends: friendsBefore } = (await getFriends(user.userId, viewer.token, 200))
                .body;
            expect(friendsBefore[0].friendState).toBe("NOT_FRIEND");

            await (
                await addFriendRequest(friend.userId, viewer.token, 200)
            ).body;
            const { friends: friendsAfter } = (await getFriends(user.userId, viewer.token, 200))
                .body;

            expect(friendsAfter[0].friendState).toBe("FRIEND_REQUEST_SENT");
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
    describe("getUserHomeData", () => {
        test("should return user data", async () => {
            await signup("User", 201);
            const { token } = (await login("User", 200)).body;
            const { user } = (await getUserHomeData(token, 200)).body;

            expect(user.firstName).toBe("User");
            expect(user.lastName).toBe("User");
            expect(user.imageMini).toBeDefined();
        });

        test("should return friend requests count", async () => {
            await signup("User", 201);
            await signup("Friend", 201);
            const { userId, token } = (await login("User", 200)).body;
            const { token: friendToken } = (await login("Friend", 200)).body;
            await addFriendRequest(userId, friendToken, 200);

            const { user } = (await getUserHomeData(token, 200)).body;

            expect(user.friendRequestsCount).toBe(1);
        });

        test("should return notification count", async () => {
            await signup("User", 201);
            await signup("Friend", 201);
            const { userId, token } = (await login("User", 200)).body;
            const { token: friendToken } = (await login("Friend", 200)).body;
            const { postId } = (await addPost(token, 1, 201)).body;
            await addLikeToPost(friendToken, postId, 200);

            const { user } = (await getUserHomeData(token, 200)).body;

            expect(user.notificationsCount).toBe(1);
        });
    });
    describe("getFriendRecommendation", () => {
        test("should return friends' friends (without user's already friends)", async () => {
            await signup("User", 201);
            await signup("FriendOne", 201);
            await signup("FriendTwo", 201);
            await signup("RecOne", 201); // friend of Friend1
            await signup("RecTwo", 201); // friend of Friend2
            await signup("RecThree", 201); // friend of Friend1 and Friend2

            const { userId: uId, token: uToken } = (await login("User", 200)).body;
            const { userId: f1Id, token: f1Token } = (await login("FriendOne", 200)).body;
            const { userId: f2Id, token: f2Token } = (await login("FriendTwo", 200)).body;
            const { userId: r1Id, token: r1Token } = (await login("RecOne", 200)).body;
            const { userId: r2Id, token: r2Token } = (await login("RecTwo", 200)).body;
            const { userId: r3Id, token: r3Token } = (await login("RecThree", 200)).body;
            // user's friends
            await addFriendRequest(f1Id, uToken, 200);
            await addFriendRequest(f2Id, uToken, 200);
            //friend's friends
            await addFriendRequest(f1Id, f2Token, 200);
            await addFriendRequest(r2Id, f2Token, 200);
            await addFriendRequest(r3Id, f1Token, 200);
            await addFriendRequest(r3Id, f2Token, 200);

            await acceptFriendRequest(f1Id, f1Token, uId, 200);
            await acceptFriendRequest(f2Id, f2Token, uId, 200);

            await acceptFriendRequest(f2Id, f2Token, f1Id, 200);
            await acceptFriendRequest(r2Id, r2Token, f2Id, 200);
            await acceptFriendRequest(r3Id, r3Token, f1Id, 200);
            await acceptFriendRequest(r3Id, r3Token, f2Id, 200);

            const { friendRecommendation } = (await getFriendRecommendation(uId, uToken, 200)).body;
            expect(friendRecommendation).toContainEqual(
                expect.objectContaining({
                    _id: r1Id,
                    mutualFriends: 0,
                })
            );
            expect(friendRecommendation).toContainEqual(
                expect.objectContaining({
                    _id: r2Id,
                    mutualFriends: 1,
                })
            );
            expect(friendRecommendation).toContainEqual(
                expect.objectContaining({
                    _id: r3Id,
                    mutualFriends: 2,
                })
            );
            expect(friendRecommendation).not.toContainEqual(
                expect.objectContaining({
                    _id: uId,
                })
            );
            expect(friendRecommendation).not.toContainEqual(
                expect.objectContaining({
                    _id: f1Id,
                })
            );
            expect(friendRecommendation).not.toContainEqual(
                expect.objectContaining({
                    _id: f2Id,
                })
            );
        });
        test("skip and limit works", async () => {
            await signup("User", 201);
            await signup("FriendOne", 201);
            await signup("FriendTwo", 201);
            await signup("RecOne", 201); // friend of Friend1
            await signup("RecTwo", 201); // friend of Friend2
            await signup("RecThree", 201); // friend of Friend1 and Friend2
            await signup("RecFour", 201);

            const { userId: uId, token: uToken } = (await login("User", 200)).body;
            const { userId: f1Id, token: f1Token } = (await login("FriendOne", 200)).body;
            const { userId: f2Id, token: f2Token } = (await login("FriendTwo", 200)).body;
            const { userId: r1Id, token: r1Token } = (await login("RecOne", 200)).body;
            const { userId: r2Id, token: r2Token } = (await login("RecTwo", 200)).body;
            const { userId: r3Id, token: r3Token } = (await login("RecThree", 200)).body;
            const { userId: r4Id, token: r4Token } = (await login("RecFour", 200)).body;
            // user's friends
            await addFriendRequest(f1Id, uToken, 200);
            await addFriendRequest(f2Id, uToken, 200);

            //friend's friends
            await addFriendRequest(r1Id, f1Token, 200);
            await addFriendRequest(r2Id, f1Token, 200);
            await addFriendRequest(r3Id, f1Token, 200);
            await addFriendRequest(r4Id, f1Token, 200);

            await addFriendRequest(r4Id, f2Token, 200);

            await acceptFriendRequest(f1Id, f1Token, uId, 200);
            await acceptFriendRequest(f2Id, f2Token, uId, 200);

            await acceptFriendRequest(r1Id, r1Token, f1Id, 200);
            await acceptFriendRequest(r2Id, r2Token, f1Id, 200);
            await acceptFriendRequest(r3Id, r3Token, f1Id, 200);
            await acceptFriendRequest(r4Id, r4Token, f1Id, 200);

            await acceptFriendRequest(r4Id, r4Token, f2Id, 200);

            const { friendRecommendation } = (
                await getFriendRecommendation(uId, uToken, 200, "skip=1&limit=2")
            ).body;

            expect(friendRecommendation.length).toBe(2);

            expect(friendRecommendation).not.toContainEqual(
                expect.objectContaining({
                    _id: r4Id,
                })
            );
        });
    });
    describe("setAdmin", () => {
        test("grant", async () => {
            await signup("User", 201);
            const { userId: uId, token: uToken } = (await login("User", 200)).body;
            await setAdmin(uId, uToken, 200, "grant=" + process.env.ADMIN_PASSWORD);
            const { isAdmin } = await User.findById(uId, { isAdmin: 1 });
            expect(isAdmin).toBe(true);
        });
        test("revoke", async () => {
            await signup("User", 201);
            const { userId: uId, token: uToken } = (await login("User", 200)).body;
            await setAdmin(uId, uToken, 200, "revoke=" + process.env.ADMIN_PASSWORD);
            const { isAdmin } = await User.findById(uId, { isAdmin: 1 });
            expect(isAdmin).toBe(false);
        });
        test("should not work if password is wrong", async () => {
            await signup("User", 201);
            const { userId: uId, token: uToken } = (await login("User", 200)).body;
            await setAdmin(uId, uToken, 400, "grant=" + "WRONG_PASSWORD");
            const { isAdmin } = await User.findById(uId, { isAdmin: 1 });
            expect(isAdmin).toBe(false);
        });
    });
});
