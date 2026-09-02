import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { config } from "../config/config.js";

export const ensureAdmin = async () => {
	const adminEmail = process.env.ADMIN_EMAIL || config.adminUsername;
	const adminPassword = process.env.ADMIN_PASSWORD || config.adminPassword;

	if (!adminEmail || !adminPassword) {
		console.warn("No hay credenciales de admin en variables de entorno. Saltando seeder.");
		return;
	}

	const existing = await User.findOne({ email: adminEmail });
	if (existing) return;

	const hash = await bcrypt.hash(adminPassword, 10);
	await User.create({ email: adminEmail, passwordHash: hash, role: "admin" });
	console.log("Admin creado:", adminEmail);
};