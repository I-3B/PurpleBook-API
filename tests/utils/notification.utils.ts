import request from "supertest";
import app from "../../app";

const getNotifications = (token: String) => {
    return request(app)
        .get("/api/notifications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
};

const setNotificationsAsViewed = (token: String) => {
    return request(app)
        .patch("/api/notifications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
};

export { getNotifications, setNotificationsAsViewed };
