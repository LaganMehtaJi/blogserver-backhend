import Post from "../models/Post.models.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logError = (context, error) => {
  const logPath = path.join(__dirname, "../server-error.log");
  const logMessage = `[${new Date().toISOString()}] ERROR in ${context}: ${error.stack || error.message || error}\n`;
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (err) {
    console.error("Failed to write to log file:", err);
  }
};


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
      innerImageUrl,
      metaTitle,
      metaDescription,
      keywords,
      metaTags
    } = req.body;

    // Basic validation
    if (!title || !excerpt || !fullContent || !category) {
      return res.status(400).json({ message: "Required fields are missing: Title, Excerpt, Content, and Category" });
    }

    // Auto-generate slug from title
    const slug = await makeUniqueSlug(generateSlug(title));

    let outerImage = {
      id: "",
      url: (outerImageUrl && outerImageUrl.trim()) || "https://picsum.photos/id/134/800/600"
    };
    let innerImage = {
      id: "",
      url: (innerImageUrl && innerImageUrl.trim()) || "https://picsum.photos/id/134/800/600"
    };

    if (req.files) {
      if (req.files.outerImage && req.files.outerImage.length > 0) {
        outerImage = {
          id: req.files.outerImage[0].filename || "",
          url: req.files.outerImage[0].path || "",
        };
      }
      if (req.files.innerImage && req.files.innerImage.length > 0) {
        innerImage = {
          id: req.files.innerImage[0].filename || "",
          url: req.files.innerImage[0].path || "",
        };
      }
    }

    // Parse metaTags — can be JSON string (FormData) or array
    let parsedMetaTags = [];
    if (metaTags) {
      try {
        parsedMetaTags = typeof metaTags === 'string' ? JSON.parse(metaTags) : metaTags;
      } catch (e) {
        parsedMetaTags = [];
      }
    }

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = typeof tags === 'string' ? tags.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
    }

    const newPost = new Post({
      title: title.trim(),
      slug,
      excerpt: excerpt.trim(),
      fullContent,
      category: category.trim(),
      tags: parsedTags,
      featured: featured === 'true' || featured === true,
      date: date ? new Date(date) : new Date(),
      outerImage,
      innerImage,
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
      keywords: keywords || "",
      metaTags: parsedMetaTags,
    });

    await newPost.save();

    res.status(201).json({
      message: "Post added successfully ✅",
      post: newPost,
    });
  } catch (error) {
    logError("addPost", error);
    console.error("Error adding post:", error);
    res.status(500).json({ message: "Server Error while adding post", error: error.message });
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
    logError("getAllPosts", error);
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
    logError("getPostById", error);
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
    logError("getPostBySlug", error);
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

    let updatedOuterImage = post.outerImage || { id: "", url: "" };
    let updatedInnerImage = post.innerImage || { id: "", url: "" };

    const hasNewOuterFile = req.files && req.files.outerImage && req.files.outerImage.length > 0;
    const hasNewInnerFile = req.files && req.files.innerImage && req.files.innerImage.length > 0;

    if (hasNewOuterFile) {
      if (post.outerImage && post.outerImage.id) {
        try {
          await cloudinary.uploader.destroy(post.outerImage.id);
        } catch (delErr) {
          console.warn("Could not destroy old outer image in Cloudinary:", delErr.message);
        }
      }
      updatedOuterImage = {
        id: req.files.outerImage[0].filename || "",
        url: req.files.outerImage[0].path || "",
      };
    } else if (req.body.outerImageUrl !== undefined && req.body.outerImageUrl.trim()) {
      const trimmedUrl = req.body.outerImageUrl.trim();
      const isSameUrl = post.outerImage && post.outerImage.url === trimmedUrl;
      updatedOuterImage = {
        id: isSameUrl ? (post.outerImage.id || "") : "",
        url: trimmedUrl
      };
    }

    if (hasNewInnerFile) {
      if (post.innerImage && post.innerImage.id) {
        try {
          await cloudinary.uploader.destroy(post.innerImage.id);
        } catch (delErr) {
          console.warn("Could not destroy old inner image in Cloudinary:", delErr.message);
        }
      }
      updatedInnerImage = {
        id: req.files.innerImage[0].filename || "",
        url: req.files.innerImage[0].path || "",
      };
    } else if (req.body.innerImageUrl !== undefined && req.body.innerImageUrl.trim()) {
      const trimmedUrl = req.body.innerImageUrl.trim();
      const isSameUrl = post.innerImage && post.innerImage.url === trimmedUrl;
      updatedInnerImage = {
        id: isSameUrl ? (post.innerImage.id || "") : "",
        url: trimmedUrl
      };
    }

    // Regenerate slug if title changed
    let updatedSlug = post.slug;
    if (req.body.title && req.body.title.trim() !== post.title) {
      updatedSlug = await makeUniqueSlug(generateSlug(req.body.title), post._id);
    }

    // Parse metaTags if provided
    let parsedMetaTags = undefined;
    if (req.body.metaTags !== undefined) {
      try {
        parsedMetaTags = typeof req.body.metaTags === 'string' ? JSON.parse(req.body.metaTags) : req.body.metaTags;
      } catch (e) {
        parsedMetaTags = [];
      }
    }

    let parsedTags = undefined;
    if (req.body.tags !== undefined) {
      try {
        parsedTags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
      } catch (e) {
        parsedTags = typeof req.body.tags === 'string' ? req.body.tags.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
    }

    const updatedData = {
      ...(req.body.title !== undefined && { title: req.body.title.trim() }),
      ...(req.body.excerpt !== undefined && { excerpt: req.body.excerpt.trim() }),
      ...(req.body.fullContent !== undefined && { fullContent: req.body.fullContent }),
      ...(req.body.category !== undefined && { category: req.body.category.trim() }),
      ...(parsedTags !== undefined && { tags: parsedTags }),
      ...(req.body.featured !== undefined && { featured: req.body.featured === 'true' || req.body.featured === true }),
      ...(req.body.date !== undefined && { date: new Date(req.body.date) }),
      slug: updatedSlug,
      outerImage: updatedOuterImage,
      innerImage: updatedInnerImage,
      ...(req.body.metaTitle !== undefined && { metaTitle: req.body.metaTitle }),
      ...(req.body.metaDescription !== undefined && { metaDescription: req.body.metaDescription }),
      ...(req.body.keywords !== undefined && { keywords: req.body.keywords }),
      ...(parsedMetaTags !== undefined && { metaTags: parsedMetaTags }),
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
    logError("updatePost", error);
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Server Error while updating post", error: error.message });
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

    // Delete images from Cloudinary safely
    if (post.outerImage && post.outerImage.id) {
      try {
        await cloudinary.uploader.destroy(post.outerImage.id);
      } catch (delErr) {
        console.warn("Could not delete outer image from Cloudinary:", delErr.message);
      }
    }
    if (post.innerImage && post.innerImage.id) {
      try {
        await cloudinary.uploader.destroy(post.innerImage.id);
      } catch (delErr) {
        console.warn("Could not delete inner image from Cloudinary:", delErr.message);
      }
    }

    await Post.findByIdAndDelete(id);
    res.status(200).json({ message: "Post deleted successfully ✅" });
  } catch (error) {
    logError("deletePost", error);
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Server Error while deleting post", error: error.message });
  }
};

// =======================================
// 🔄 Generate Slugs for All Existing Posts (One-time migration)
// =======================================
export const generateSlugsForAll = async (req, res) => {
  try {
    const { force } = req.query;
    let query = { $or: [{ slug: null }, { slug: "" }, { slug: { $exists: false } }] };
    
    if (force === 'true') {
      query = {}; // Fetch all posts to force regenerate URLs
    }

    const posts = await Post.find(query);
    let updated = 0;

    for (const post of posts) {
      // Exclude current post ID when generating to avoid self-collision if already unique
      const slug = await makeUniqueSlug(generateSlug(post.title), post._id);
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
