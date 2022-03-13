import request from "supertest";
import app from "./app";
const getUser = (userId: String, token: String, status: Number) => {
    return request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const editUser = (edit: String, userId: String, token: String, status: Number) => {
    return request(app)
        .put(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${token}`)
        .field("firstName", `${edit}`)
        .field("lastName", `${edit}`)
        .expect(status);
};
const deleteUser = (userId: String, token: String, status: Number) => {
    return request(app)
        .delete(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const addFriendRequest = (userId: String, token: String, status: Number) => {
    return request(app)
        .post(`/api/users/${userId}/friend-requests`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const getFriendRequests = (userId: String, token: String, status: Number) => {
    return request(app)
        .get(`/api/users/${userId}/friend-requests`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const setFriendRequestsAsViewed = (userId: String, token: String, status: Number) => {
    return request(app)
        .put(`/api/users/${userId}/friend-requests`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const acceptFriendRequest = (userId: String, token: String, friendId: String, status: Number) => {
    return request(app)
        .post(`/api/users/${userId}/friends/${friendId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const getFriends = (userId: String, token: String, status: Number) => {
    return request(app)
        .get(`/api/users/${userId}/friends`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const deleteFriend = (userId: String, token: String, friendId: String, status: Number) => {
    return request(app)
        .delete(`/api/users/${userId}/friends/${friendId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
export {
    getUser,
    editUser,
    deleteUser,
    addFriendRequest,
    getFriendRequests,
    setFriendRequestsAsViewed,
    acceptFriendRequest,
    getFriends,
    deleteFriend,
};
