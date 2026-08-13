import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      default: "global_seo"
    },
    metaTitle: {
      type: String,
      trim: true,
      default: "AyuraNature | Holistic Wellness & Natural Healing",
    },
    metaDescription: {
      type: String,
      trim: true,
      default: "Natural Health & Holistic Wellness Guide | AyuraNature",
    },
    keywords: {
      type: String,
      trim: true,
      default: "Ayurvedic Home Remedies",
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

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
