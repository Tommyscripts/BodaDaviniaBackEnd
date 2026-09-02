import { config } from "../config/config.js";

export const login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Usuario y contraseña son obligatorios",
    });
  }

  if (
    username !== config.adminUsername ||
    password !== config.adminPassword
  ) {
    return res.status(401).json({
      message: "Usuario o contraseña incorrectos",
    });
  }

  return res.status(200).json({
    message: "Login correcto",
  });
};