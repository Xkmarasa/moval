/* eslint-disable require-jsdoc */
// Utilidades y funciones helper

const {ALLOWED_ORIGINS} = require("./config");
const logger = require("firebase-functions/logger");

// Función wrapper para añadir CORS
function withCors(handler) {
  return async (req, res) => {
    const origin = req.headers.origin || req.headers.Origin || req.get("origin") || req.get("Origin");

    const allowedOrigins = [
      "https://moval-fff66.web.app",
      "https://moval-fff66.firebaseapp.com",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5000",
    ];

    let allowedOrigin = "*";
    if (ALLOWED_ORIGINS && ALLOWED_ORIGINS !== "*") {
      allowedOrigin = ALLOWED_ORIGINS;
    } else if (origin && allowedOrigins.includes(origin)) {
      allowedOrigin = origin;
    } else if (origin) {
      allowedOrigin = origin;
    }

    res.set("Access-Control-Allow-Origin", allowedOrigin);
    res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Max-Age", "3600");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      await handler(req, res);
    } catch (error) {
      logger.error("Unhandled error", {error: error.message, stack: error.stack});
      if (!res.headersSent) {
        res.set("Access-Control-Allow-Origin", allowedOrigin);
        res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        res.status(500).json({error: "INTERNAL", message: error.message});
      }
    }
  };
}

// Función auxiliar para establecer headers CORS
function setCorsHeaders(req, res) {
  const origin = req.headers.origin || req.headers.Origin || req.get("origin") || req.get("Origin");
  const allowedOrigins = [
    "https://moval-fff66.web.app",
    "https://moval-fff66.firebaseapp.com",
    "http://localhost:3000",
  ];
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : "*";
  res.set("Access-Control-Allow-Origin", allowedOrigin);
  res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.set("Access-Control-Allow-Credentials", "true");
}

// Normaliza el body de la request
function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === "object") return body;
  try {
    return JSON.parse(body);
  } catch (error) {
    return {};
  }
}

// Normaliza el usuario para la respuesta
function sanitizeUser(userDoc) {
  const username = userDoc.usuario || userDoc.username;
  const normalizedUsername = typeof username === "string" ? username.toLowerCase() : "";
  const derivedRole = userDoc.rol || userDoc.role ||
    (normalizedUsername === "admin" ? "admin" :
      normalizedUsername === "informes" ? "informes" : "user");

  return {
    id: userDoc._id,
    usuario: username,
    nombre: userDoc.nombre || userDoc.name || username,
    rol: derivedRole,
  };
}

module.exports = {
  withCors,
  setCorsHeaders,
  normalizeBody,
  sanitizeUser,
};

