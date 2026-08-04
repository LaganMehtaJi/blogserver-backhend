import express from "express";
import upload from "../utils/multerConfig.js";
import {
  addPost,
  getAllPosts,
  getPostById,
  getPostBySlug,
  updatePost,
  deletePost,
  generateSlugsForAll,
} from "../controllers/Post.controllers.js";

const router = express.Router();

// Add Post
router.post("/add", upload.fields([{ name: 'outerImage', maxCount: 1 }, { name: 'innerImage', maxCount: 1 }]), addPost);

// Get All Posts
router.get("/", getAllPosts);

// Generate slugs for all existing posts (one-time migration)
router.get("/generate-slugs", generateSlugsForAll);

// Get Single Post by Slug (must be before /:id)
router.get("/slug/:slug", getPostBySlug);

// Get Single Post by ID
router.get("/:id", getPostById);

// Update Post
router.put("/update/:id", upload.fields([{ name: 'outerImage', maxCount: 1 }, { name: 'innerImage', maxCount: 1 }]), updatePost);

// Delete Post
router.delete("/delete/:id", deletePost);

export default router;
