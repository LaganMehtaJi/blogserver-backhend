import Post from "../models/Post.models.js";
import cloudinary from "../utils/cloudinary.js";

// =======================================
// ➕ Add Post
// =======================================
export const addPost = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      fullContent,
      category,
      tags,
      featured,
      date,
      imageUrl // Optional if no file is uploaded
    } = req.body;

    // Basic validation
    if (!title || !excerpt || !fullContent || !category) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    let image = { id: "", url: imageUrl || "https://picsum.photos/id/134/800/600" };

    // If file uploaded to Cloudinary via Multer
    if (req.file) {
      image = {
        id: req.file.filename, // This is the public_id in multer-storage-cloudinary
        url: req.file.path,     // This is the secure_url in multer-storage-cloudinary
      };
    } else if (req.files && req.files.length > 0) {
      image = {
        id: req.files[0].filename,
        url: req.files[0].path,
      };
    }

    const newPost = new Post({
      title,
      excerpt,
      fullContent,
      category,
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      featured: featured === 'true' || featured === true,
      date: date || new Date(),
      image,
    });

    await newPost.save();

    res.status(201).json({
      message: "Post added successfully ✅",
      post: newPost,
    });
  } catch (error) {
    console.error("Error adding post:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// =======================================
// 📂 Get All Posts
// =======================================
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// =======================================
// 🔍 Get Post By ID
// =======================================
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(200).json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// =======================================
// ✏️ Update Post
// =======================================
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    let updatedImage = post.image;

    // If new image uploaded
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (post.image && post.image.id) {
        await cloudinary.uploader.destroy(post.image.id);
      }
      updatedImage = {
        id: req.file.filename,
        url: req.file.path,
      };
    } else if (req.files && req.files.length > 0) {
      if (post.image && post.image.id) {
        await cloudinary.uploader.destroy(post.image.id);
      }
      updatedImage = {
        id: req.files[0].filename,
        url: req.files[0].path,
      };
    } else if (req.body.imageUrl) {
        updatedImage = { id: "", url: req.body.imageUrl };
    }

    const updatedData = {
      ...req.body,
      tags: req.body.tags ? (typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags) : undefined,
      featured: req.body.featured !== undefined ? (req.body.featured === 'true' || req.body.featured === true) : undefined,
      image: updatedImage
    };

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Post updated successfully ✅",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// =======================================
// ❌ Delete Post
// =======================================
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Delete image from Cloudinary
    if (post.image && post.image.id) {
      await cloudinary.uploader.destroy(post.image.id);
    }

    await Post.findByIdAndDelete(id);
    res.status(200).json({ message: "Post deleted successfully ✅" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
