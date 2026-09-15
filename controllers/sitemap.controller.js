import Post from "../models/Post.models.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Possible paths for Frontend/sitemap.xml depending on runtime environment
const SITEMAP_FILE_PATHS = [
  path.join(__dirname, "../../Frontend/sitemap.xml"),
  path.join(__dirname, "../Frontend/sitemap.xml"),
  path.join(process.cwd(), "Frontend/sitemap.xml"),
  path.join(process.cwd(), "../Frontend/sitemap.xml"),
];

export const getSitemapFilePath = () => {
  for (const p of SITEMAP_FILE_PATHS) {
    if (fs.existsSync(p)) return p;
    if (fs.existsSync(path.dirname(p))) return p;
  }
  return SITEMAP_FILE_PATHS[0];
};

// Helper: Escape XML special characters
export const escapeXml = (unsafe) => {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

// Helper: Generate slug from title if slug missing
export const toSlug = (title) => {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

// Format date safely as YYYY-MM-DD
export const formatDate = (val) => {
  try {
    const d = val ? new Date(val) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return d.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

// Static site pages to include in sitemap
export const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/home", priority: "0.9", changefreq: "daily" },
  { path: "/about", priority: "0.8", changefreq: "monthly" },
  { path: "/contact", priority: "0.5", changefreq: "monthly" },
  { path: "/category", priority: "0.8", changefreq: "daily" },
  { path: "/privacy-policy", priority: "0.5", changefreq: "monthly" },
  { path: "/terms", priority: "0.5", changefreq: "monthly" },
  { path: "/disclaimer", priority: "0.5", changefreq: "monthly" },
];

// Build complete Sitemap XML string
export const buildSitemapXml = (posts, siteUrl = "https://www.ayuranature.com") => {
  const today = formatDate(new Date());

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Static Pages
  for (const page of STATIC_PAGES) {
    xml += `  <url>\n`;
    xml += `    <loc>${siteUrl}${page.path === "/" ? "/" : page.path}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // 2. Dynamic Blog Posts
  for (const post of posts) {
    const slug = post.slug || toSlug(post.title);
    if (!slug) continue;
    const postUrl = `${siteUrl}/blog-detail?title=${encodeURIComponent(slug)}`;
    const lastmod = formatDate(post.updatedAt || post.date);

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(postUrl)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
};

// Sync sitemap.xml to disk
export const syncSitemapFile = async (providedPosts = null) => {
  try {
    const posts = providedPosts || await Post.find({}, "title slug updatedAt date").sort({ date: -1 });
    const xml = buildSitemapXml(posts);
    const filePath = getSitemapFilePath();

    if (filePath) {
      fs.writeFileSync(filePath, xml, "utf8");
      console.log(`✅ sitemap.xml synced successfully (${posts.length} posts) at ${filePath}`);
      return { success: true, count: posts.length, path: filePath };
    }
    return { success: false, message: "Sitemap file path not found" };
  } catch (error) {
    console.error("❌ Error syncing sitemap file:", error.message);
    return { success: false, error: error.message };
  }
};

// =======================================
// 🗺️ Dynamic Route: GET /sitemap.xml
// Search engines and browsers fetch this directly
// =======================================
export const generateSitemap = async (req, res) => {
  try {
    const posts = await Post.find({}, "title slug updatedAt date").sort({ date: -1 });
    const xml = buildSitemapXml(posts);

    // Sync file in background (non-blocking)
    syncSitemapFile(posts).catch(() => {});

    res.header("Content-Type", "application/xml; charset=utf-8");
    res.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.status(200).send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).json({ message: "Error generating sitemap", error: error.message });
  }
};

// =======================================
// 🔄 API Route: GET/POST /api/sitemap/sync
// Admin dashboard or webhooks trigger this
// =======================================
export const syncSitemapApi = async (req, res) => {
  try {
    const posts = await Post.find({}, "title slug updatedAt date").sort({ date: -1 });
    const result = await syncSitemapFile(posts);
    return res.status(200).json({
      success: true,
      message: `Sitemap successfully updated with ${posts.length} posts`,
      ...result
    });
  } catch (error) {
    console.error("Error in syncSitemapApi:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
