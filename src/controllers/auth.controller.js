import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { config } from "../config/config.js";

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son obligatorios" });
  }

  try {
    if (!config.mongoUri) {
      // demo fallback for deployments without Mongo: accept any credentials for testing
      return res.status(200).json({ token: "demo-token", user: { email } });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Usuario o contraseña incorrectos" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: "Usuario o contraseña incorrectos" });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: "12h" });

    return res.status(200).json({ message: "Login correcto", token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error interno" });
  }
};

export const changePassword = async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: "Missing password" });

  // If no DB, accept for demo
  if (!config.mongoUri) {
    return res.json({ ok: true });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("changePassword error", err);
    return res.status(500).json({ message: "Error cambiando contraseña" });
  }
};