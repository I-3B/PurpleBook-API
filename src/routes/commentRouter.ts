import express from "express";
import commentController from "../controllers/commentController";
import commentFindAndAuthorize from "../utils/commentFindAndAuthorize";

const router = express.Router({ mergeParams: true });

router.post("/", commentController.addComment);
router.get("/", commentController.getAllComments);
router.get("/:commentId", commentController.getComment);
router.patch("/:commentId", commentFindAndAuthorize, commentController.editComment);
router.delete("/:commentId", commentFindAndAuthorize, commentController.deleteComment);

router.post("/:commentId/likes", commentController.addLike);
router.get("/:commentId/likes", commentController.getLikes);
router.delete("/:commentId/likes", commentController.unlike);

export default router;
