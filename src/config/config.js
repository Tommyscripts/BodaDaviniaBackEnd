import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  adminUsername: process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || null,
  adminPassword: process.env.ADMIN_PASSWORD || null,
  jwtSecret: process.env.JWT_SECRET || null,
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads"),
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || null,
};