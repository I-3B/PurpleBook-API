import express from "express";
import commentController from "../controllers/commentController";
import authorizeComment from "../utils/authorizeComment";

const router = express.Router({ mergeParams: true });

router.post("/", commentController.addComment);
router.get("/", commentController.getAllComments);
router.patch("/:commentId", authorizeComment, commentController.editComment);
router.delete("/:commentId", authorizeComment, commentController.deleteComment);


export default router;
