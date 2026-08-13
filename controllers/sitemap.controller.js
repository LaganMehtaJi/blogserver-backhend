import Post from "../models/Post.models.js";

// =======================================
// 🗺️ Generate Sitemap XML
// Auto-generates sitemap.xml from all blog posts
// =======================================
export const generateSitemap = async (req, res) => {
  try {
    const siteUrl = "https://www.ayuranature.com";

    // Fetch all posts (only needed fields for sitemap)
    const posts = await Post.find({}, "slug updatedAt date").sort({ date: -1 });

    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Homepage
    xml += `  <url>\n`;
    xml += `    <loc>${siteUrl}</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // Blog posts
    for (const post of posts) {
      const lastmod = (post.updatedAt || post.date).toISOString().split("T")[0];
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}/blog-detail?title=${post.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml");
    res.status(200).send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).json({ message: "Error generating sitemap", error: error.message });
  }
};
