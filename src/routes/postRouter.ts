import express from "express";
import multer from "multer";
import postController from "../controllers/postController";
import authorizePost from "../utils/authorizePost";
import commentRouter from "./commentRouter";

const router = express.Router();
const upload = multer();
router.post("/", upload.any(), postController.addPost);
router.get("/:postId", postController.getPost);
router.patch("/:postId", authorizePost, postController.editPost);
router.delete("/:postId", authorizePost, postController.deletePost);

router.use("/:postId/comments", commentRouter);

export default router;