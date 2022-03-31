import { clearDB, dbConnect, dbDisconnect } from "../src/configs/mongoConfigTesting";
import { COMMENT_CHARACTERS_LIMIT } from "../src/controllers/commentController";
import { login, signup } from "./utils/auth.utils";
import {
    addComment,
    addLikeToComment,
    deleteComment,
    editComment,
    getAllComments,
    getCommentLikes,
    unlikeComment,
} from "./utils/comment.utils";
import { getNotifications } from "./utils/notification.utils";
import { addPost } from "./utils/post.utils";

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

describe("comment route", () => {
    describe("addComment", () => {
        test("should be able to comment on a post", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;

            await addComment(token, postId, 1, 201);
            const { comments } = (await getAllComments(token, postId, 200)).body;
            expect(comments).toContainEqual(expect.objectContaining({ content: "b" }));
        });

        test("should not be able to comment with more than the characters limit", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;

            await addComment(token, postId, COMMENT_CHARACTERS_LIMIT + 1, 400);
        });

        test("should not be able to comment on a non existent post", async () => {
            const nonExistentPostId = userId;

            await addComment(token, nonExistentPostId, 1, 404);
        });

        test("should send a notification to post author", async () => {
            await signup("commenter", 201);
            const commenter = (await login("commenter", 200)).body;
            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(commenter.token, postId, 1, 201)).body;

            const { notifications } = (await getNotifications(token)).body;

            expect(notifications[0].links).toContainEqual(
                expect.objectContaining({ linkId: commenter.userId, ref: "User" })
            );
            expect(notifications[0].links).toContainEqual(
                expect.objectContaining({ linkId: commentId, ref: "Comment" })
            );
            expect(notifications[0].links).toContainEqual(
                expect.objectContaining({ linkId: postId, ref: "Post" })
            );
        });

        test("should not send a notification if the commenter is the post author", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;

            const { notifications } = (await getNotifications(token)).body;

            expect(notifications.length).toBe(0);
        });
    });

    describe("getAllComments", () => {
        test("should return all comments for a post", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            await addComment(token, postId, 1, 201);
            await addComment(token, postId, 2, 201);

            const { comments } = (await getAllComments(token, postId, 200)).body;
            expect(comments).toContainEqual(expect.objectContaining({ content: "b" }));
            expect(comments).toContainEqual(expect.objectContaining({ content: "bb" }));
        });

        test("should return a partition of comments when using skip and limit", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;

            for (let i = 1; i <= 30; i++) {
                await addComment(token, postId, i, 201);
            }

            const { comments } = (
                await getAllComments(token, postId, 200, "skip=10&limit=5&sort=date")
            ).body;
            //limit = 5
            expect(comments.length).toBe(5);
            //skip = 10, the fist comment should be the 20th comment because we sorted by the newest
            expect(comments[0].content.length).toBe(20);
        });

        test("likedByUser should work", async () => {
            await signup("AnotherUser", 201);
            const anotherUser = (await login("AnotherUser", 200)).body;

            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;
            await addLikeToComment(token, postId, commentId, 200);

            const { comments } = (await getAllComments(token, postId, 200)).body;
            const { comments: anotherUserCommentsView } = (
                await getAllComments(anotherUser.token, postId, 200)
            ).body;

            expect(comments[0].likedByUser).toBe(true);
            expect(anotherUserCommentsView[0].likedByUser).toBe(false);
        });
    });

    describe("editComment", () => {
        test("should be able to edit a comment when authorized", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;

            await editComment(token, postId, commentId, 3, 200);

            const { comments } = (await getAllComments(token, postId, 200)).body;
            expect(comments).toContainEqual(expect.objectContaining({ content: "bbb" }));
        });

        test("should not be able to edit a comment when not authorized", async () => {
            await signup("anotherUser", 201);
            const { token: anotherToken } = (await login("anotherUser", 200)).body;

            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;

            await editComment(anotherToken, postId, commentId, 1, 403);
        });

        test("should not be able to edit a comment with more than the characters limit", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;

            const { commentId } = (await addComment(token, postId, 1, 201)).body;

            await editComment(token, postId, commentId, COMMENT_CHARACTERS_LIMIT + 1, 400);
        });

        test("should not be able to edit non existent comment", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            const nonExistentCommentId = postId;
            await editComment(token, postId, nonExistentCommentId, 1, 404);
        });
    });
    describe("deleteComment", () => {
        test("should be able to delete comment when authorized", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;
            await deleteComment(token, postId, commentId, 200);
        });

        test("should not be able to delete comment when not authorized", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            const nonExistentCommentId = postId;
            await deleteComment(token, postId, nonExistentCommentId, 404);
        });

        test("should not be able to delete a nonexistent comment", async () => {
            await signup("anotherUser", 201);
            const { token: anotherToken } = (await login("anotherUser", 200)).body;

            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;

            await deleteComment(anotherToken, postId, commentId, 403);
        });
    });

    describe("addLike", () => {
        test("adding likes to a post should work", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;
            await addLikeToComment(token, postId, commentId, 200);
        });

        test("adding a like to already liked post should not work", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;

            const { commentId } = (await addComment(token, postId, 1, 201)).body;
            await addLikeToComment(token, postId, commentId, 200);
            await addLikeToComment(token, postId, commentId, 400);

            const { likes } = (await getCommentLikes(token, postId, commentId, 200)).body;

            expect(likes.length).toBe(1);
        });

        test("adding a like to non existent post should not work", async () => {
            const nonExistentPostId = userId;
            const nonExistentCommentId = userId;
            await addLikeToComment(token, nonExistentPostId, nonExistentCommentId, 404);
        });

        test("adding a like should notify comment author", async () => {
            await signup("likeSender", 201);
            const likeSender = (await login("likeSender", 200)).body;

            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;
            await addLikeToComment(likeSender.token, postId, commentId, 200);

            const { notifications } = (await getNotifications(token)).body;
            expect(notifications[0].links).toContainEqual(
                expect.objectContaining({ linkId: postId, ref: "Post" })
            );
            expect(notifications[0].links).toContainEqual(
                expect.objectContaining({ linkId: commentId, ref: "Comment" })
            );
            expect(notifications[0].links).toContainEqual(
                expect.objectContaining({ linkId: likeSender.userId, ref: "User" })
            );
        });

        test("adding a like as author should not send a notification ", async () => {
            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;
            await addLikeToComment(token, postId, commentId, 200);

            const { notifications } = (await getNotifications(token)).body;
            expect(notifications.length).toBe(0);
        });
    });

    describe("getLikes", () => {
        test("getting likes should return array of users", async () => {
            await signup("UserOne", 201);
            const userOne = (await login("UserOne", 200)).body;

            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;

            await addLikeToComment(userOne.token, postId, commentId, 200);
            await addLikeToComment(token, postId, commentId, 200);

            const { likes } = (await getCommentLikes(token, postId, commentId, 200)).body;

            expect(likes.length).toBe(2);
            expect(likes).toContainEqual(expect.objectContaining({ firstName: "User" }));
            expect(likes).toContainEqual(expect.objectContaining({ firstName: "UserOne" }));
        });

        test("should not return an array if post is not found", async () => {
            const nonExistentPostId = userId;
            const nonExistentCommentId = userId;
            await getCommentLikes(token, nonExistentPostId, nonExistentCommentId, 404);
        });
    });

    describe("unlike", () => {
        test("should remove user like form likes array to a post", async () => {
            await signup("UserOne", 201);
            const userOne = (await login("UserOne", 200)).body;
            const { postId } = (await addPost(token, 1, 201)).body;
            const { commentId } = (await addComment(token, postId, 1, 201)).body;

            await addLikeToComment(userOne.token, postId, commentId, 200);
            await addLikeToComment(token, postId, commentId, 200);

            await unlikeComment(userOne.token, postId, commentId, 200);
            const { likes } = (await getCommentLikes(token, postId, commentId, 200)).body;

            expect(likes).toContainEqual(expect.objectContaining({ firstName: "User" }));
            expect(likes).not.toContainEqual(expect.objectContaining({ firstName: "UserOne" }));
            expect(likes.length).toBe(1);
        });
    });
});
