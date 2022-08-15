import request from "supertest";
import app from "../../app";

const addComment = (token: String, postId: String, commentLength: number, status: Number) => {
    return request(app)
        .post(`/api/posts/${postId}/comments`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: generateCharacters(commentLength) })
        .expect(status);
};
const getAllComments = (token: String, postId: String, status: Number, queryOptions?: String) => {
    return request(app)
        .get(`/api/posts/${postId}/comments?${queryOptions}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const getComment = (token: String, postId: String, commentId: String, status: Number) => {
    return request(app)
        .get(`/api/posts/${postId}/comments/${commentId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const editComment = (
    token: String,
    postId: String,
    commentId: String,
    commentLength: number,
    status: Number
) => {
    return request(app)
        .patch(`/api/posts/${postId}/comments/${commentId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: generateCharacters(commentLength) })
        .expect(status);
};
const deleteComment = (token: String, postId: String, commentId: String, status: Number) => {
    return request(app)
        .delete(`/api/posts/${postId}/comments/${commentId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};

const addLikeToComment = (token: String, postId: String, commentId: String, status: Number) => {
    return request(app)
        .post(`/api/posts/${postId}/comments/${commentId}/likes`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};

const getCommentLikes = (token: String, postId: String, commentId: String, status: Number) => {
    return request(app)
        .get(`/api/posts/${postId}/comments/${commentId}/likes`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};

const unlikeComment = (token: String, postId: String, commentId: String, status: Number) => {
    return request(app)
        .delete(`/api/posts/${postId}/comments/${commentId}/likes`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const generateCharacters = (length: number) => {
    return "b".repeat(length);
};
export {
    addComment,
    getAllComments,
    getComment,
    editComment,
    deleteComment,
    addLikeToComment,
    getCommentLikes,
    unlikeComment,
};
