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
      outerImageUrl,
      innerImageUrl
    } = req.body;

    // Basic validation
    if (!title || !excerpt || !fullContent || !category) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    let outerImage = { id: "", url: outerImageUrl || "https://picsum.photos/id/134/800/600" };
    let innerImage = { id: "", url: innerImageUrl || "https://picsum.photos/id/134/800/600" };

    if (req.files) {
      if (req.files.outerImage) {
        outerImage = {
          id: req.files.outerImage[0].filename,
          url: req.files.outerImage[0].path,
        };
      }
      if (req.files.innerImage) {
        innerImage = {
          id: req.files.innerImage[0].filename,
          url: req.files.innerImage[0].path,
        };
      }
    }

    const newPost = new Post({
      title,
      excerpt,
      fullContent,
      category,
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      featured: featured === 'true' || featured === true,
      date: date || new Date(),
      outerImage,
      innerImage,
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
// 🔍 Get Post By Title
// =======================================
export const getPostByTitle = async (req, res) => {
  try {
    const { title } = req.params;
    // Decode the title in case it is URL encoded, then find by exact match
    // Or we can use regex to ignore case
    const decodedTitle = decodeURIComponent(title);
    
    // We try to find a post matching the title exactly (case-insensitive)
    const post = await Post.findOne({ 
      title: { $regex: new RegExp(`^${decodedTitle}$`, 'i') } 
    });
    
    if (!post) {
      // Sometimes frontend might pass slugs with hyphens, handle if needed
      // const hyphenReplaced = decodedTitle.replace(/-/g, ' ');
      // const postFallback = await Post.findOne({ title: { $regex: new RegExp(`^${hyphenReplaced}$`, 'i') } });
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(200).json(post);
  } catch (error) {
    console.error("Error fetching post by title:", error);
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

    let updatedOuterImage = post.outerImage;
    let updatedInnerImage = post.innerImage;

    if (req.files) {
      if (req.files.outerImage) {
        if (post.outerImage && post.outerImage.id) {
          await cloudinary.uploader.destroy(post.outerImage.id);
        }
        updatedOuterImage = {
          id: req.files.outerImage[0].filename,
          url: req.files.outerImage[0].path,
        };
      }
      if (req.files.innerImage) {
        if (post.innerImage && post.innerImage.id) {
          await cloudinary.uploader.destroy(post.innerImage.id);
        }
        updatedInnerImage = {
          id: req.files.innerImage[0].filename,
          url: req.files.innerImage[0].path,
        };
      }
    }

    if (req.body.outerImageUrl) updatedOuterImage = { id: "", url: req.body.outerImageUrl };
    if (req.body.innerImageUrl) updatedInnerImage = { id: "", url: req.body.innerImageUrl };

    const updatedData = {
      ...req.body,
      tags: req.body.tags ? (typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags) : undefined,
      featured: req.body.featured !== undefined ? (req.body.featured === 'true' || req.body.featured === true) : undefined,
      outerImage: updatedOuterImage,
      innerImage: updatedInnerImage
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

    // Delete images from Cloudinary
    if (post.outerImage && post.outerImage.id) {
      await cloudinary.uploader.destroy(post.outerImage.id);
    }
    if (post.innerImage && post.innerImage.id) {
      await cloudinary.uploader.destroy(post.innerImage.id);
    }

    await Post.findByIdAndDelete(id);
    res.status(200).json({ message: "Post deleted successfully ✅" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
