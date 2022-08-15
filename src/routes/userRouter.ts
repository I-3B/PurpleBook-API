import express from "express";
import multer from "multer";
import userController from "../controllers/userController";
const router = express.Router({ mergeParams: true });
const upload = multer();
router.get("/", userController.getUser);
router.get("/edit_data", userController.getUserBeforeEdit);
router.patch("/", upload.any(), userController.editUser);
router.delete("/", userController.deleteUser);
router.post("/admin", userController.setAdmin);

router.get("/posts", userController.getPosts);
router.get("/comments", userController.getComments);

router.get("/friend_state/:friendId", userController.getFriendState);
router.get("/friend_recommendation", userController.getFriendRecommendation);
router.get("/friend_requests", userController.getFriendRequests);
router.post("/friend_requests", userController.addFriendRequest);
router.patch("/friend_requests", userController.setFriendRequestsAsViewed);
router.delete("/friend_requests/:friendRequestId", userController.deleteFriendRequest);
router.delete("/sent_friend_requests/:friendId", userController.deleteSentFriendRequest);

router.get("/friends", userController.getFriends);
router.delete("/friends/:friendId", userController.deleteFriend);
router.post("/friends/:friendId", userController.acceptFriendRequest);

export default router;
