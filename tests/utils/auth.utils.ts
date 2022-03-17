import request from "supertest";
import app from "../app";

const signup = (name: String, status: Number) => {
    return request(app)
        .post("/api/auth/signup")
        .field("firstName", `${name}`)
        .field("lastName", `${name}`)
        .field("email", `${name}@gmail.com`)
        .field("password", "12345678")
        .expect(status);
};
const login = (name: String, status: Number, password?: String) => {
    return request(app)
        .post("/api/auth/login")
        .send({ email: `${name}@gmail.com`, password: password || "12345678" })
        .expect(status);
};
export { signup, login };
