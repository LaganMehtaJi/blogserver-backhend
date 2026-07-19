import express from "express";
import ConnectDB from "./config/db.js";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import productRoutes from "./routes/Product.routes.js";
import postRoutes from "./routes/Post.routes.js";

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "Frontend" directory
app.use(express.static(path.join(__dirname, "../Frontend")));

// ============================
// API Routes
// ============================

app.use("/api/products", productRoutes);
app.use("/api/posts", postRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running and .env is loaded correctly [Lagan---2]" });
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
// Connect DB & Start Server
// ============================

ConnectDB();

app.listen(process.env.PORT || 8080, (error) => {
  if (error) {
    console.log(`Error: ${error}`);
  } else {
    console.log(`Server running on port ${process.env.PORT || 8080} 🚀`);
  }
});
