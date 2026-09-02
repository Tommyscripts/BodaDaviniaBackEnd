import mongoose from "mongoose";
import { config } from "../config/config.js";

export const connectDB = async () => {
  if (!config.mongoUri) {
    console.warn("No existe MONGO_URI en la configuración. No se conectará a la BD.");
    return;
  }

  try {
    await mongoose.connect(config.mongoUri, {
      dbName: process.env.DB_NAME || "boda_db",
    });
    console.log("Conectado a MongoDB");
  } catch (err) {
    console.error("Error conectando a MongoDB:", err.message);
    throw err;
  }
};
