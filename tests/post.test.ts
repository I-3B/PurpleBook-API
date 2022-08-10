import sharp from "sharp";
import { clearDB, dbConnect, dbDisconnect } from "../src/configs/mongoConfigTesting";
import Post from "../src/models/Post";
import { POST_CHARACTERS_LIMIT } from "../src/utils/validateForm";
import { login, signup } from "./utils/auth.utils";
import { addComment, getAllComments } from "./utils/comment.utils";
import { getNotifications } from "./utils/notification.utils";
import {
    addLikeToPost,
    addPost,
    addPostWithImage,
    deletePost,
    editPost,
    getFeed,
    getPost,
    getPostLikes,
    unlikePost,
} from "./utils/post.utils";
import { acceptFriendRequest, addFriendRequest } from "./utils/user.utils";

let token: String;
let userId: String;
beforeAll(async () => await dbConnect());
beforeEach(async () => {
    await clearDB();
    await signup("User", 201);
    let response = (await login("User", 200)).body;
    token = response.token;
    userId = response.userId;
});
afterAll(async () => await dbDisconnect());

describe("post route", () => {
    describe("addPost", () => {
        test("submitted post with only content should work", async () => {
            await addPost(token, 1, 201);
        });

        test("submitted post with content more than the characters limit should not work", async () => {
            await addPost(token, POST_CHARACTERS_LIMIT + 1, 400);
        });
        test("adding post with image should work", async () => {
            const { postId } = (await addPostWithImage(token, 1, "images/post.jpg", 201)).body;
            const post = await Post.findOne({ _id: postId });

            expect(post.image).toBeDefined();

            const { height, width } = await sharp(post.image.data).metadata();

            expect(height).toBeLessThanOrEqual(768);
            expect(width).toBeLessThanOrEqual(768);
        });

        test("adding an image without content should work", async () => {
            await addPostWithImage(token, 0, "images/post.jpg", 201);
        });

        test("post without content and image should not work", async () => {
            await addPost(token, 0, 400);
        });
        test("uploading file that is not an image should not work", async () => {
            await addPostWithImage(token, 1, "images/file.txt", 400);
        });
    });

    describe("editPost", () => {
        test("editing post with only content should work", async () => {
            const { postId } = (await addPost(token, 10, 201)).body;
            await editPost(token, postId, 1, 200);
        });

        test("editing post with content more than the characters limit should not work", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            await editPost(token, postId, POST_CHARACTERS_LIMIT + 1, 400);
        });

        test("should not be able to edit post if not authorized", async () => {
            await signup("UserOne", 201);
            const { token: tokenOne } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 201);
            const { token: tokenTwo } = (await login("UserTwo", 200)).body;
            const { postId } = (await addPost(tokenOne, 1, 201)).body;
            await editPost(tokenTwo, postId, 1, 403);
        });

        test("should not be able to edit a non existent post", async () => {
            const nonExistentPostId = userId;
            await editPost(token, nonExistentPostId, 1, 404);
        });
    });

    describe("getPost", () => {
        test("get post should work", async () => {
            const { postId } = (await addPost(token, 2, 201)).body;
            const { post } = (await getPost(token, postId, 200)).body;

            expect(post.content).toBe("aa");
        });

        test("should return 404 if post is not found", async () => {
            const wrongPostId = userId;
            await getPost(token, wrongPostId, 404);
        });

        test("likedByUser should work", async () => {
            await signup("AnotherUser", 201);
            const anotherUser = (await login("AnotherUser", 200)).body;

            const { postId } = (await addPost(token, 1, 201)).body;
            await addLikeToPost(token, postId, 200);

            const { post } = (await getPost(token, postId, 200)).body;
            const { post: anotherUserPostView } = (await getPost(anotherUser.token, postId, 200))
                .body;

            expect(post.likedByUser).toBe(true);
            expect(anotherUserPostView.likedByUser).toBe(false);
        });
    });

    describe("deletePost", () => {
        test("deleting post should work", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;

            await deletePost(token, postId, 200);

            await getPost(token, postId, 404);
        });

        test("deleting a post should remove all its comments", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            await addComment(token, postId, 1, 201);
            await addComment(token, postId, 2, 201);
            await addComment(token, postId, 3, 201);

            const { comments } = (await getAllComments(token, postId, 200)).body;
            expect(comments.length).toBe(3);

            await deletePost(token, postId, 200);

            const { comments: commentsAfterDelete } = (await getAllComments(token, postId, 200))
                .body;
            expect(commentsAfterDelete.length).toBe(0);
        });
    });

    describe("addLike", () => {
        test("adding likes to a post should work", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            await addLikeToPost(token, postId, 200);
        });

        test("adding a like to already liked post should not work", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;

            await addLikeToPost(token, postId, 200);
            await addLikeToPost(token, postId, 400);

            const { users } = (await getPostLikes(token, postId, 200)).body;
            expect(users.length).toBe(1);
        });

        test("adding a like to non existent post should not work", async () => {
            const nonExistentPostId = userId;
            await addLikeToPost(token, nonExistentPostId, 404);
        });

        test("adding a like should notify post author", async () => {
            await signup("likeSender", 201);
            const likeSender = (await login("likeSender", 200)).body;

            const { postId } = (await addPost(token, 1, 201)).body;
            await addLikeToPost(likeSender.token, postId, 200);

            const { notifications } = (await getNotifications(token)).body;

            expect(notifications[0].links).toContainEqual(
                expect.objectContaining({ linkId: postId, ref: "Post" })
            );
            expect(notifications[0].links).toContainEqual(
                expect.objectContaining({ linkId: likeSender.userId, ref: "User" })
            );
        });

        test("adding a like as author should not send a notification", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            await addLikeToPost(token, postId, 200);

            const { notifications } = (await getNotifications(token)).body;
            expect(notifications.length).toBe(0);
        });
    });

    describe("getLikes", () => {
        test("getting likes should return array of users", async () => {
            await signup("UserOne", 201);
            const userOne = (await login("UserOne", 200)).body;

            const { postId } = (await addPost(token, 1, 201)).body;

            await addLikeToPost(token, postId, 200);
            await addLikeToPost(userOne.token, postId, 200);

            const { users } = (await getPostLikes(token, postId, 200)).body;

            expect(users.length).toBe(2);
            expect(users).toContainEqual(expect.objectContaining({ firstName: "User" }));
            expect(users).toContainEqual(expect.objectContaining({ firstName: "UserOne" }));
        });

        test("should not return an array if post is not found", async () => {
            const nonExistentPostId = userId;
            await getPostLikes(token, nonExistentPostId, 404);
        });
    });

    describe("unlike", () => {
        test("should remove user like form likes array to a post", async () => {
            await signup("UserOne", 201);
            const userOne = (await login("UserOne", 200)).body;
            const { postId } = (await addPost(token, 1, 201)).body;

            await addLikeToPost(token, postId, 200);
            await addLikeToPost(userOne.token, postId, 200);

            await unlikePost(userOne.token, postId, 200);
            const { users } = (await getPostLikes(token, postId, 200)).body;

            expect(users).toContainEqual(expect.objectContaining({ firstName: "User" }));
            expect(users).not.toContainEqual(expect.objectContaining({ firstName: "UserOne" }));
            expect(users.length).toBe(1);
        });
    });
    describe("feed", () => {
        test("should get feed after adding a post", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;

            const { posts } = (await getFeed(token, "", 200)).body;
            expect(posts).toContainEqual(expect.objectContaining({ _id: postId }));
        });
        test("should be descending in date", async () => {
            (await addPost(token, 1, 201)).body;
            const { postId } = (await addPost(token, 1, 201)).body;

            const { posts } = (await getFeed(token, "", 200)).body;
            expect(posts[0]).toMatchObject({ _id: postId });
        });
        test("likedByUser should work", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            const { postId: postNotLikedId } = (await addPost(token, 1, 201)).body;
            await addLikeToPost(token, postId, 200);

            const { posts } = (await getFeed(token, "", 200)).body;
            expect(posts[1]).toMatchObject({ _id: postId, likedByUser: true });
            expect(posts[0]).toMatchObject({ _id: postNotLikedId, likedByUser: false });
        });
        test("should be able to view a friend post", async () => {
            await signup("friend", 201);
            const friend = (await login("friend", 200)).body;
            await addFriendRequest(userId, friend.token, 200);
            await acceptFriendRequest(userId, token, friend.userId, 200);
            const { postId } = (await addPost(friend.token, 1, 201)).body;

            const { posts } = (await getFeed(token, "", 200)).body;

            expect(posts[0]._id).toBe(postId);
        });
    });
});
