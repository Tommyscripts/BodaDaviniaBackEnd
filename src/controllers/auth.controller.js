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