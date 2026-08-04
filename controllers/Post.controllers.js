import Post from "../models/Post.models.js";
import cloudinary from "../utils/cloudinary.js";

// =======================================
// 🔧 Generate Slug from Title
// Only lowercase letters and hyphens (no numbers, no special chars)
// Example: "Ayurvedic Skincare Tips 2024!" → "ayurvedic-skincare-tips"
// =======================================
export const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z\s-]/g, "")   // remove everything except letters, spaces, hyphens
    .trim()
    .replace(/\s+/g, "-")         // replace spaces with hyphens
    .replace(/-+/g, "-")          // multiple hyphens to single hyphen
    .replace(/^-|-$/g, "");       // remove leading/trailing hyphens
};

// Make slug unique by appending a suffix if duplicate exists
const makeUniqueSlug = async (slug, excludeId = null) => {
  let uniqueSlug = slug;
  let suffix = 0;
  const suffixLetters = "abcdefghijklmnopqrstuvwxyz";

  while (true) {
    const query = { slug: uniqueSlug };
    if (excludeId) query._id = { $ne: excludeId };

    const existing = await Post.findOne(query);
    if (!existing) return uniqueSlug;

    // Append letter suffix: -a, -b, -c, etc.
    uniqueSlug = `${slug}-${suffixLetters[suffix]}`;
    suffix++;
    if (suffix >= suffixLetters.length) {
      uniqueSlug = `${slug}-${Date.now()}`;
      break;
    }
  }
  return uniqueSlug;
};

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

    // Auto-generate slug from title
    const slug = await makeUniqueSlug(generateSlug(title));

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
      slug,
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
// 🔍 Get Post By Slug
// =======================================
export const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await Post.findOne({ slug: slug.toLowerCase() });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(200).json(post);
  } catch (error) {
    console.error("Error fetching post by slug:", error);
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

    // Regenerate slug if title changed
    let updatedSlug = post.slug;
    if (req.body.title && req.body.title !== post.title) {
      updatedSlug = await makeUniqueSlug(generateSlug(req.body.title), post._id);
    }

    const updatedData = {
      ...req.body,
      slug: updatedSlug,
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

// =======================================
// 🔄 Generate Slugs for All Existing Posts (One-time migration)
// =======================================
export const generateSlugsForAll = async (req, res) => {
  try {
    const posts = await Post.find({ $or: [{ slug: null }, { slug: "" }, { slug: { $exists: false } }] });
    let updated = 0;

    for (const post of posts) {
      const slug = await makeUniqueSlug(generateSlug(post.title));
      post.slug = slug;
      await post.save();
      updated++;
    }

    res.status(200).json({
      message: `Slugs generated for ${updated} posts ✅`,
      totalProcessed: updated,
    });
  } catch (error) {
    console.error("Error generating slugs:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
