import express from 'express';
import Settings from '../models/Settings.models.js';

const router = express.Router();

// Get Home SEO Settings
router.get('/home-seo', async (req, res) => {
    try {
        let settings = await Settings.findOne({ type: 'global_seo' });
        if (!settings) {
            // Return defaults if none exists
            settings = {
                metaTitle: "AyuraNature | Holistic Wellness & Natural Healing",
                metaDescription: "Natural Health & Holistic Wellness Guide | AyuraNature",
                keywords: "Ayurvedic Home Remedies",
                metaTags: []
            };
        }
        res.status(200).json(settings);
    } catch (err) {
        console.error("Fetch SEO error:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch SEO settings' });
    }
});

// Update Home SEO Settings
router.post('/update-home-seo', async (req, res) => {
    const { title, description, keywords, metaTags } = req.body;
    try {
        let settings = await Settings.findOne({ type: 'global_seo' });
        
        let parsedMetaTags = [];
        if (metaTags) {
            try {
                parsedMetaTags = typeof metaTags === 'string' ? JSON.parse(metaTags) : metaTags;
            } catch (e) {
                console.error("Error parsing meta tags", e);
            }
        }

        if (settings) {
            if (title !== undefined) settings.metaTitle = title;
            if (description !== undefined) settings.metaDescription = description;
            if (keywords !== undefined) settings.keywords = keywords;
            if (metaTags !== undefined) settings.metaTags = parsedMetaTags;
            await settings.save();
        } else {
            settings = new Settings({
                type: 'global_seo',
                metaTitle: title || "",
                metaDescription: description || "",
                keywords: keywords || "",
                metaTags: parsedMetaTags
            });
            await settings.save();
        }

        res.status(200).json({ success: true, message: 'SEO settings updated successfully', data: settings });
    } catch (err) {
        console.error("SEO update error:", err);
        res.status(500).json({ success: false, message: 'Failed to update SEO settings' });
    }
});

export default router;
