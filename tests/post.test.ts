import { clearDB, dbConnect, dbDisconnect } from "../src/configs/mongoConfigTesting";
import { login, signup } from "./utils/auth.utils";
import { addPost, deletePost, editPost, getPost } from "./utils/post.utils";
beforeAll(async () => await dbConnect());
beforeEach(async () => await clearDB());
afterAll(async () => await dbDisconnect());

describe("post route", () => {
    describe("addPost", () => {
        test("submitted post with only content should work", async () => {
            await signup("User", 201);
            const { token } = (await login("User", 200)).body;
            await addPost(token, 1, 201);
        });
        test("submitted post with more than 5000 characters content should not work", async () => {
            await signup("User", 201);
            const { token } = (await login("User", 200)).body;
            await addPost(token, 5001, 400);
        });
    });

    describe("editPost", () => {
        test("editing post with only content should work", async () => {
            await signup("User", 201);
            const { token } = (await login("User", 200)).body;
            const {
                post: { _id: postId },
            } = (await addPost(token, 10, 201)).body;
            await editPost(token, postId, 1, 200);
        });
        test("editing post with more than 5000 characters content should not work", async () => {
            await signup("User", 201);
            const { token } = (await login("User", 200)).body;
            const {
                post: { _id: postId },
            } = (await addPost(token, 1, 201)).body;
            await editPost(token, postId, 5001, 400);
        });
        test("should not be able to edit post if not authorized", async () => {
            await signup("UserOne", 201);
            const { token: tokenOne } = (await login("UserOne", 200)).body;
            await signup("UserTwo", 201);
            const { token: tokenTwo } = (await login("UserTwo", 200)).body;
            const {
                post: { _id: postId },
            } = (await addPost(tokenOne, 1, 201)).body;
            await editPost(tokenTwo, postId, 1, 403);
        });
    });

    describe("getPost", () => {
        test("get post should work", async () => {
            await signup("User", 201);
            const { token } = (await login("User", 200)).body;
            const { post: postAdded } = (await addPost(token, 2, 201)).body;
            const { post } = (await getPost(token, postAdded._id, 200)).body;

            expect(post.content).toBe("aa");
        });
        test("should return 404 if post is not found", async () => {
            await signup("User", 201);
            const { token, userId } = (await login("User", 200)).body;

            const wrongPostId = userId;
            await getPost(token, wrongPostId, 404);
        });
    });

    describe("deletePost", () => {
        test("deleting post should work", async () => {
            await signup("User", 201);
            const { token } = (await login("User", 200)).body;
            const { post } = (await addPost(token, 1, 201)).body;

            await deletePost(token, post._id, 200);

            await getPost(token, post._id, 404);
        });

        test("should not be able to delete post if not authorized", async () => {});

        test.todo("deleting a post should remove all its comments");

        test.todo("");
    });
});
