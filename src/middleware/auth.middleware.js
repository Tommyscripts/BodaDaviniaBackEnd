import { config } from "../config/config.js";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "No estás autenticado",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token || token !== config.adminPassword) {
    return res.status(401).json({
      message: "Token de autenticación inválido",
    });
  }

  next();
};