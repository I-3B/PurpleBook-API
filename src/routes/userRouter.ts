import express from "express";
import multer from "multer";
import userController from "../controllers/userController";
const router = express.Router({ mergeParams: true });
const upload = multer();

router.get("/", userController.getUser);
router.patch("/", upload.any(), userController.editUser);
router.delete("/", userController.deleteUser);

router.get("/friend_requests", userController.getFriendRequests);
router.post("/friend_requests", userController.addFriendRequest);
router.patch("/friend_requests", userController.setFriendRequestsAsViewed);

router.get("/friends", userController.getFriends);
router.delete("/friends/:friendId", userController.deleteFriend);
router.post("/friends/:friendId", userController.acceptFriendRequest);


export default router;
