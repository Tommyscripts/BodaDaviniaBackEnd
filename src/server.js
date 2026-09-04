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
      try {
        const parsed = new URL(origin);
        if (parsed.hostname && parsed.hostname.endsWith(".railway.app")) return callback(null, true);
      } catch (e) {
        // ignore invalid origin
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    optionsSuccessStatus: 200,
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
  try {
    const origin = req.get("origin");
    if (origin) {
      const allow =
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin) ||
        (() => {
          try {
            return new URL(origin).hostname.endsWith(".railway.app");
          } catch (e) {
            return false;
          }
        })();

      if (allow) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
    }
  } catch (e) {
    // ignore header-setting errors
  }
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