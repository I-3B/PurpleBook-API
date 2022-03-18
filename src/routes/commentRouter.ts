import express from "express";
import commentController from "../controllers/commentController";
import commentFindAndAuthorize from "../utils/commentFindAndAuthorize";

const router = express.Router({ mergeParams: true });

router.post("/", commentController.addComment);
router.get("/", commentController.getAllComments);
router.patch("/:commentId", commentFindAndAuthorize, commentController.editComment);
router.delete("/:commentId", commentFindAndAuthorize, commentController.deleteComment);

export default router;
