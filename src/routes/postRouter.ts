import express from "express";
import multer from "multer";
import postController from "../controllers/postController";
import postFindAndAuthorize from "../utils/postFindAndAuthorize";
import commentRouter from "./commentRouter";

const router = express.Router();
const upload = multer();

router.get("/feed", postController.getFeed);

router.post("/", upload.any(), postController.addPost);
router.get("/:postId", postController.getPost);
router.patch("/:postId", postFindAndAuthorize, postController.editPost);
router.delete("/:postId", postFindAndAuthorize, postController.deletePost);

router.get("/:postId/likes", postController.getLikes);
router.post("/:postId/likes", postController.addLike);
router.delete("/:postId/likes", postController.unlike);

router.use("/:postId/comments", commentRouter);

export default router;
