#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { config } from "../config/config.js";

const argv = process.argv.slice(2);
const email = argv[0] || process.env.ADMIN_EMAIL || config.adminUsername;
const password = argv[1] || process.env.ADMIN_PASSWORD || config.adminPassword;

if (!email || !password) {
  console.error(
    "Uso: pnpm run create-user -- email password  O establecer ADMIN_EMAIL y ADMIN_PASSWORD en variables de entorno"
  );
  process.exit(1);
}

const mongoUri = process.env.MONGO_URI || config.mongoUri;
if (!mongoUri) {
  console.error("MONGO_URI no configurada. Define MONGO_URI con la cadena de conexión a MongoDB.");
  process.exit(1);
}

(async () => {
  try {
    console.log("Conectando a MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Conectado a MongoDB.");

    const existing = await User.findOne({ email });
    const hash = await bcrypt.hash(password, 10);

    if (existing) {
      existing.passwordHash = hash;
      await existing.save();
      console.log("Usuario actualizado:", email);
    } else {
      await User.create({ email, passwordHash: hash, role: "admin" });
      console.log("Usuario creado:", email);
    }
  } catch (err) {
    console.error("Error creando/actualizando usuario:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
