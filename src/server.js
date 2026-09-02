import express from "express";
import cors from "cors";
import path from "path";

import { config } from "./config/config.js";
import authRoutes from "./routes/auth.routes.js";
import imagesRoutes from "./routes/images.routes.js";
import { connectDB } from "./lib/db.js";
import { ensureAdmin } from "./seed/createAdmin.js";

const app = express();

app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/images", imagesRoutes);

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend funcionando correctamente" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
});

const start = async () => {
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