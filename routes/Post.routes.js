import express from "express";
import upload from "../utils/multerConfig.js";
import {
  addPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
} from "../controllers/Post.controllers.js";

const router = express.Router();

// Add Post
router.post("/add", upload.single("image"), addPost);

// Get All Posts
router.get("/", getAllPosts);

// Get Single Post
router.get("/:id", getPostById);

// Update Post
router.put("/update/:id", upload.single("image"), updatePost);

// Delete Post
router.delete("/delete/:id", deletePost);

export default router;
