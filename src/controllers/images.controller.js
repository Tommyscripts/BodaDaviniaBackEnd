import fs from "fs";
import path from "path";
import { config } from "../config/config.js";

export const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se ha enviado ninguna imagen" });
  }

  return res.status(201).json({
    message: "Imagen subida correctamente",
    image: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
    },
  });
};

export const downloadImage = (req, res) => {
  const { filename } = req.params;

  if (!filename) {
    return res.status(400).json({ message: "No se ha especificado ninguna imagen" });
  }

  const filePath = path.join(config.uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Imagen no encontrada" });
  }

  return res.download(filePath);
};

export const deleteImage = (req, res) => {
  const { filename } = req.params;

  if (!filename) {
    return res.status(400).json({ message: "No se ha especificado ninguna imagen" });
  }

  const filePath = path.join(config.uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Imagen no encontrada" });
  }

  try {
    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "Imagen eliminada correctamente", filename });
  } catch (err) {
    return res.status(500).json({ message: "Error al eliminar la imagen" });
  }
};