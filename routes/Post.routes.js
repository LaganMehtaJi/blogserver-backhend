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
router.post("/add", upload.fields([{ name: 'outerImage', maxCount: 1 }, { name: 'innerImage', maxCount: 1 }]), addPost);

// Get All Posts
router.get("/", getAllPosts);

// Get Single Post
router.get("/:id", getPostById);

// Update Post
router.put("/update/:id", upload.fields([{ name: 'outerImage', maxCount: 1 }, { name: 'innerImage', maxCount: 1 }]), updatePost);

// Delete Post
router.delete("/delete/:id", deletePost);

export default router;
