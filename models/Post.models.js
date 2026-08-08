import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
    },
    fullContent: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    outerImage: {
      id: {
        type: String,
      },
      url: {
        type: String,
        required: true,
      },
    },
    innerImage: {
      id: {
        type: String,
      },
      url: {
        type: String,
        required: true,
      },
    },
    // ============================
    // 🔍 SEO Meta Fields
    // ============================
    metaTitle: {
      type: String,
      trim: true,
      default: "",
    },
    metaDescription: {
      type: String,
      trim: true,
      default: "",
    },
    keywords: {
      type: String,
      trim: true,
      default: "",
    },
    metaTags: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
