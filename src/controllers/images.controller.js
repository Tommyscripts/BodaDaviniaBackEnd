import fs from "fs";
import path from "path";
import { config } from "../config/config.js";

import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { config as envConfig } from "../config/config.js";

// Configure Cloudinary if env present
if (envConfig.cloudinaryCloudName && envConfig.cloudinaryApiKey && envConfig.cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: envConfig.cloudinaryCloudName,
    api_key: envConfig.cloudinaryApiKey,
    api_secret: envConfig.cloudinaryApiSecret,
  });
}

const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

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

  // Cloudinary (if configured)
  if (envConfig.cloudinaryCloudName && cloudinary && req.file && req.file.buffer) {
    try {
      const result = await uploadToCloudinary(req.file.buffer, envConfig.cloudinaryFolder || undefined);
      return res.status(201).json({
        message: "Imagen subida correctamente",
        image: {
          filename: result.public_id,
          originalName: req.file.originalname,
          size: req.file.size,
          url: result.secure_url,
        },
      });
    } catch (err) {
      console.error("Error subiendo a Cloudinary:", err);
      // fallthrough to try S3 or local
    }
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

export const downloadImage = async (req, res) => {
  const { filename } = req.params;

  if (!filename) {
    return res.status(400).json({ message: "No se ha especificado ninguna imagen" });
  }

  // S3 path: generate a presigned URL and redirect
  if (config.s3Bucket && config.awsRegion) {
    try {
      const cmd = new GetObjectCommand({ Bucket: config.s3Bucket, Key: filename });
      const url = await getSignedUrl(s3Client, cmd, { expiresIn: 60 });
      return res.redirect(url);
    } catch (err) {
      console.error("Error obteniendo objeto S3:", err);
      return res.status(500).json({ message: "Error obteniendo la imagen" });
    }
  }

  const filePath = path.join(config.uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Imagen no encontrada" });
  }

  return res.download(filePath);
};

export const deleteImage = async (req, res) => {
  const { filename } = req.params;

  if (!filename) {
    return res.status(400).json({ message: "No se ha especificado ninguna imagen" });
  }

  // S3 deletion
  if (config.s3Bucket && config.awsRegion) {
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: config.s3Bucket, Key: filename }));
      return res.status(200).json({ message: "Imagen eliminada correctamente", filename });
    } catch (err) {
      console.error("Error eliminando objeto S3:", err);
      return res.status(500).json({ message: "Error al eliminar la imagen" });
    }
  }

  const filePath = path.join(config.uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Imagen no encontrada" });
  }

  try {
    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "Imagen eliminada correctamente", filename });
  } catch (err) {
    console.error("Error eliminando archivo local:", err);
    return res.status(500).json({ message: "Error al eliminar la imagen" });
  }
};