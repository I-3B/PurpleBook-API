import { clearDB, dbConnect, dbDisconnect } from "../src/configs/mongoConfigTesting";
import { POST_CHARACTERS_LIMIT } from "../src/controllers/postController";
import { login, signup } from "./utils/auth.utils";
import { addComment, getAllComments } from "./utils/comment.utils";
import { addPost, deletePost, editPost, getPost } from "./utils/post.utils";

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
});
