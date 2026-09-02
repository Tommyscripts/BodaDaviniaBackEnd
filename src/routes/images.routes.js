import express from "express";
import multer from "multer";

import {
  uploadImage,
  downloadImage,
  deleteImage,
} from "../controllers/images.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

import { config } from "../config/config.js";

const upload = multer({
  dest: config.uploadDir,
});

router.post("/upload", upload.single("image"), uploadImage);

router.get("/:filename/download", authMiddleware, downloadImage);

router.delete("/:filename", authMiddleware, deleteImage);

export default router;