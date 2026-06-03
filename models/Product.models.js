import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true, // for searching
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Paper Cups",
        "Paper Plates",
        "Bowls",
        "Disposable Glasses",
        "Food Containers",
        "Cutlery",
        "Packaging Supplies",
        "Essential Oils",
        "Herbal Teas",
        "Natural Skincare",
        "Wellness Supplements",
        "Aromatherapy",
        "Organic Seeds",
      ],
      index: true, // filtering by category
    },

    brand: {
      type: String,
      trim: true,
      index: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true, // automatically indexed
      trim: true,
    },

    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
      index: true, // sorting & filtering
    },

    discountPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    // Stock Information
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      index: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Product Specifications
    specifications: {
      material: { type: String, trim: true },
      size: { type: String, trim: true },
      color: { type: String, trim: true },
      weight: { type: String, trim: true },
      packSize: { type: String, trim: true },
    },

    // Tags
    tags: [
      {
        type: String,
        trim: true,
        index: true, // search by tags
      },
    ],

    // Images
    images: [
      {
        id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
        alt: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],

    // Ratings
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
      index: true, // sort by rating
    },

    numReviews: {
      type: Number,
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);



// 🔥 TEXT INDEX (for search functionality)
productSchema.index({ name: "text", description: "text" });

// 🔥 COMPOUND INDEX (for filtering + sorting)
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isFeatured: 1, createdAt: -1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
