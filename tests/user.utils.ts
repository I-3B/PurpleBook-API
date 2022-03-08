import request from "supertest";
import app from "./app";
const getUser = async (id: String, token: String, status: Number) => {
    return await request(app)
        .get(`/api/users/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(status);
};
const editUser = async (
    edit: String,
    id: String,
    token: String,
    status: Number
) => {
    return await request(app)
        .put(`/api/users/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .field("firstName", `${edit}`)
        .field("lastName", `${edit}`)
        .expect(status);
};
export { getUser, editUser };
