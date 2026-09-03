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

// Usaremos almacenamiento en memoria para enviar el buffer directo a S3.
const upload = multer({ storage: multer.memoryStorage() });

// Acepta tanto 'image' como 'file' como nombre de campo multipart.
// Usamos upload.fields para evitar el error "Unexpected field" si el
// frontend envía uno u otro nombre. Después normalizamos a `req.file`
// para que el controlador `uploadImage` no necesite cambios.
router.post(
  "/upload",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  (req, res, next) => {
    if (req.files) {
      if (req.files.image && req.files.image.length > 0) {
        req.file = req.files.image[0];
      } else if (req.files.file && req.files.file.length > 0) {
        req.file = req.files.file[0];
      }
    }

    return uploadImage(req, res, next);
  }
);

// Lista imágenes (público)
router.get("/", listImages);

router.get("/:filename/download", authMiddleware, downloadImage);

router.delete("/:filename", authMiddleware, deleteImage);

export default router;