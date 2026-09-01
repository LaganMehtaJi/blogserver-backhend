import express from "express";
import ConnectDB from "./config/db.js";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import setupNginxAndSSL, { getSetupLog } from "./setup-server.js";

// Routes
import productRoutes from "./routes/Product.routes.js";
import postRoutes from "./routes/Post.routes.js";
import settingsRoutes from "./routes/Settings.routes.js";
import { generateSitemap } from "./controllers/sitemap.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

dotenv.config({ path: path.join(__dirname, ".env") });

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) or local files (origin: null)
    if (!origin || origin === 'null') {
      return callback(null, true);
    }
    callback(null, true); // Allow all other origins as well
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files from the "Frontend" directory
app.use(express.static(path.join(__dirname, "../Frontend")));

// ============================
// API Routes
// ============================

app.use("/api/products", productRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/settings", settingsRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running [v3 - Nginx Setup]" });
});

// 🗺️ Sitemap (for SEO — search engines crawl this)
app.get("/sitemap.xml", generateSitemap);

// Check Nginx Setup Status (view logs)
app.get("/api/setup-status", (req, res) => {
  const log = getSetupLog();
  res.type("text/plain").send(log);
});

// View backend error logs
app.get("/api/logs", (req, res) => {
  const logPath = path.join(__dirname, "server-error.log");
  if (fs.existsSync(logPath)) {
    res.type("text/plain").send(fs.readFileSync(logPath, "utf8"));
  } else {
    res.type("text/plain").send("No error logs found.");
  }
});

// Clear logs
app.get("/api/logs/clear", (req, res) => {
  const logPath = path.join(__dirname, "server-error.log");
  try {
    fs.writeFileSync(logPath, "");
    res.send("Logs cleared.");
  } catch (err) {
    res.status(500).send("Failed to clear logs: " + err.message);
  }
});

// Manually Trigger Nginx Setup
app.get("/api/run-setup", async (req, res) => {
  res.type("text/plain").send("Setup triggered! Check /api/setup-status for progress.");
  setupNginxAndSSL();
});

// ============================
// Serve Frontend
// ============================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/admin.html"));
});

// ============================
// Global Error Handler Middleware
// ============================
app.use((err, req, res, next) => {
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  const logPath = path.join(__dirname, "server-error.log");
  const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} (${status}): ${err.stack || err.message}\n`;
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (logErr) {
    console.error("Failed to write to log file:", logErr);
  }
  console.error("Server Error:", err);
  res.status(status).json({
    message: err.message || "Internal Server Error",
    error: err.name || "Error"
  });
});

// ============================
// Connect DB & Start Server
// ============================

ConnectDB();

app.listen(process.env.PORT || 8080, (error) => {
  if (error) {
    console.log(`Error: ${error}`);
  } else {
    console.log(`Server running on port ${process.env.PORT || 8080} 🚀`);
    // Auto-setup Nginx + SSL (only runs on Linux/AWS, skips on Windows)
    setupNginxAndSSL();
  }
});
