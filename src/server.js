import express from "express";
import cors from "cors";
import path from "path";

import { config } from "./config/config.js";
import authRoutes from "./routes/auth.routes.js";
import imagesRoutes from "./routes/images.routes.js";
import { connectDB } from "./lib/db.js";
import { ensureAdmin } from "./seed/createAdmin.js";

const app = express();

// Allow multiple frontends via FRONTEND_URLS (comma-separated) or single FRONTEND_URL
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || config.frontendUrl || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server and curl
      if (allowedOrigins.length === 0) return callback(null, true); // open if none configured
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// servir la carpeta uploads públicamente
app.use("/uploads", express.static(config.uploadDir));

app.use("/api/auth", authRoutes);
app.use("/api", imagesRoutes);
app.use("/api/images", imagesRoutes);

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend funcionando correctamente" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
});

const start = async () => {
  // Verificar que existe secreto JWT necesario para firmar tokens
  if (!config.jwtSecret) {
    console.error("JWT_SECRET no configurada. Define JWT_SECRET en las variables de entorno para habilitar autenticación.");
    process.exit(1);
  }

  if (config.mongoUri) {
    await connectDB();
    await ensureAdmin();
  } else {
    console.warn("MONGO_URI no configurada. El servidor iniciará sin DB.");
  }

  const PORT = config.port || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error("Error arrancando la aplicación:", err);
  process.exit(1);
});