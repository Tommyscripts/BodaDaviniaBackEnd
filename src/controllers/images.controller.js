import fs from "fs";
import path from "path";
import { config } from "../config/config.js";

import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({ region: config.awsRegion });

export const listImages = (req, res) => {
  try {
    // If S3 is configured, list from S3 but adapt to the simple format
    if (config.s3Bucket && config.awsRegion) {
      return s3Client
        .send(new ListObjectsV2Command({ Bucket: config.s3Bucket }))
        .then((data) => {
          const items = (data.Contents || []).map((obj) => ({
            id: obj.Key,
            url: `https://${config.s3Bucket}.s3.${config.awsRegion}.amazonaws.com/${encodeURIComponent(obj.Key)}`,
            alt: "",
          }));
          return res.json(items);
        })
        .catch((err) => {
          console.error("listImages S3 error", err);
          return res.status(500).json({ message: "Error listando imágenes" });
        });
    }

    if (!fs.existsSync(config.uploadDir)) return res.json([]);
    const files = fs.readdirSync(config.uploadDir).filter(Boolean);
    const base = `${req.protocol}://${req.get("host")}`;
    const images = files.map((f) => ({ id: f, url: `${base}/uploads/${encodeURIComponent(f)}`, alt: "" }));
    return res.json(images);
  } catch (err) {
    console.error("listImages error", err);
    return res.status(500).json({ message: "Error listando imágenes" });
  }
};

export const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se ha enviado ninguna imagen" });
  }

  // Si S3 está configurado, subimos el buffer a S3
  if (config.s3Bucket && config.awsRegion) {
    const key = `${Date.now()}_${uuidv4()}_${req.file.originalname}`;

    const params = {
      Bucket: config.s3Bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read",
    };

    return s3Client
      .send(new PutObjectCommand(params))
      .then(() => {
        const url = `https://${config.s3Bucket}.s3.${config.awsRegion}.amazonaws.com/${key}`;
        return res.status(201).json({
          message: "Imagen subida correctamente",
          image: {
            filename: key,
            originalName: req.file.originalname,
            size: req.file.size,
            url,
          },
        });
      })
      .catch((err) => {
        console.error("Error subiendo a S3:", err);
        return res.status(500).json({ message: "Error subiendo la imagen a S3" });
      });
  }

  // Si no hay S3 configurado, guardamos localmente como antes.
  const uploadsDir = config.uploadDir;

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `${Date.now()}_${uuidv4()}_${req.file.originalname}`;
  const filepath = path.join(uploadsDir, filename);

  try {
    fs.writeFileSync(filepath, req.file.buffer);
    return res.status(201).json({
      message: "Imagen subida correctamente",
      image: {
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: filepath,
      },
    });
  } catch (err) {
    console.error("Error guardando archivo localmente:", err);
    return res.status(500).json({ message: "Error guardando la imagen" });
  }
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