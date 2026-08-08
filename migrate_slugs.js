import dotenv from "dotenv";
import mongoose from "mongoose";
import Post from "./models/Post.models.js";

dotenv.config();

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const makeUniqueSlug = async (slug, postId = null) => {
  let uniqueSlug = slug;
  let count = 1;
  let query = { slug: uniqueSlug };
  if (postId) {
    query._id = { $ne: postId };
  }
  while (await Post.findOne(query)) {
    uniqueSlug = `${slug}-${count}`;
    count++;
    query.slug = uniqueSlug;
  }
  return uniqueSlug;
};

const migrateSlugs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to DB");

    const posts = await Post.find();
    let updatedCount = 0;

    for (const post of posts) {
      if (!post.slug || post.slug.includes('%') || post.slug.includes(':') || post.slug.includes(' ') || post.slug !== generateSlug(post.title)) {
        const newSlug = await makeUniqueSlug(generateSlug(post.title), post._id);
        await Post.updateOne({ _id: post._id }, { $set: { slug: newSlug } });
        console.log(`Updated slug for: "${post.title}" -> ${newSlug}`);
        updatedCount++;
      }
    }

    console.log(`Migration complete! Updated ${updatedCount} posts.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
};

migrateSlugs();
