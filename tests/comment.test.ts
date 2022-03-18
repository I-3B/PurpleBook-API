import { clearDB, dbConnect, dbDisconnect } from "../src/configs/mongoConfigTesting";
import { COMMENT_CHARACTERS_LIMIT } from "../src/controllers/commentController";
import { login, signup } from "./utils/auth.utils";
import { addComment, editComment, getAllComments } from "./utils/comment.utils";
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
});
