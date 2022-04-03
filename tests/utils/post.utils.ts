import path from "path";
import request from "supertest";
import app from "../../app";
const addPost = (token: String, postLength: number, status: Number) => {
    return request(app)
        .post("/api/posts")
        .set("Authorization", `Bearer ${token}`)
        .field("content", generateCharacters(postLength))
        .expect(status);
};
const addPostWithImage = (token: String, postLength: number, image: string, status: Number) => {
    return request(app)
        .post("/api/posts")
        .set("Authorization", `Bearer ${token}`)
        .field("content", generateCharacters(postLength))
        .attach("image.png", path.join(__dirname, image))
        .expect(status);
};
const editPost = (token: String, postId: String, postLength: number, status: Number) => {
    return request(app)
        .patch(`/api/posts/${postId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: generateCharacters(postLength) })
        .expect(status);
};
const getPost = (token: String, postId: String, status: Number) => {
    return request(app)
        .get(`/api/posts/${postId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const deletePost = (token: String, postId: String, status: Number) => {
    return request(app)
        .delete(`/api/posts/${postId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const addLikeToPost = (token: String, postId: String, status: Number) => {
    return request(app)
        .post(`/api/posts/${postId}/likes`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const getPostLikes = (token: String, postId: String, status: Number) => {
    return request(app)
        .get(`/api/posts/${postId}/likes`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const unlikePost = (token: String, postId: String, status: Number) => {
    return request(app)
        .delete(`/api/posts/${postId}/likes`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const getFeed = (token: String, query: String, status: Number) => {
    return request(app)
        .get(`/api/posts/feed/?${query}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const generateCharacters = (length: number) => {
    return "a".repeat(length);
};
export {
    addPost,
    addPostWithImage,
    editPost,
    getPost,
    deletePost,
    addLikeToPost,
    getPostLikes,
    unlikePost,
    getFeed,
};
