/* eslint-disable require-jsdoc */
const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const {MongoClient, ObjectId} = require("mongodb");
const bcrypt = require("bcryptjs");
const busboy = require("busboy");
const XLSX = require("xlsx");

// Definir los secrets de Dropbox
// - DROPBOX_ACCESS_TOKEN: token de acceso (opcional si usas refresh token)
// - DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET:
//   permiten obtener automáticamente tokens nuevos cuando caduque el anterior
const dropboxToken = defineSecret("DROPBOX_ACCESS_TOKEN");
const dropboxRefreshToken = defineSecret("DROPBOX_REFRESH_TOKEN");
const dropboxAppKey = defineSecret("DROPBOX_APP_KEY");
const dropboxAppSecret = defineSecret("DROPBOX_APP_SECRET");

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
  memory: "512MiB",
  timeoutSeconds: 540, // 9 minutos para permitir subida de fotos a Dropbox
});

const {
  MONGODB_URI = "mongodb+srv://Xavi:Xavi2712@moval.vfm7zzp.mongodb.net/",
  MONGODB_DB = "moval",
  RECORDS_COLLECTION = "registros",
  USERS_COLLECTION = "usuarios",
  REPORTS_COLLECTION = "informes", // colección genérica (no usada para los nuevos informes)
  TOOLS_COLLECTION = "herramientas",
  INITIAL_REPORTS_COLLECTION = "inicial",
  PACKAGING_REPORTS_COLLECTION = "envasado",
  PRODUCTION_REPORTS_COLLECTION = "produccion",
  WEIGHT_REPORTS_COLLECTION = "peso_producto",
  CLEANING_REPORTS_COLLECTION = "limpieza",
  CLEANING_PLANT_REPORTS_COLLECTION = "limpieza_planta",
  WITNESS_REPORTS_COLLECTION = "testigos",
  VISITORS_BOOK_COLLECTION = "libro_visitas",
  RECEPTION_EXIT_COLLECTION = "recepcion_salida_mercancia",
  CONTROL_RESIDUES_COLLECTION = "control_residuos",
  CONTROL_EXPEDICION_COLLECTION = "control_expedicion",
  CONTROL_AGUA_DIARIO_COLLECTION = "control_agua_diario",
  CONTROL_AGUA_SEMANAL_COLLECTION = "control_agua_semanal",
  CONTROL_AGUA_MENSUAL_COLLECTION = "control_agua_mensual",
  CONTROL_AGUA_TRIMESTRAL_COLLECTION = "control_agua_trimestral",
  SATISFACTION_FORMS_COLLECTION = "satisfaccion_clientes",
  ALLOWED_ORIGINS = "*",
  ADMIN_SETUP_TOKEN = "",
} = process.env;

let cachedClient;
let cachedDb;
let cachedDropboxAccessToken = null;
let cachedDropboxExpiresAt = 0;

async function getDb() {
  if (!MONGODB_URI) {
    throw new Error("Missing MongoDB connection string");
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      retryReads: true,
      retryWrites: true,
    });
  }

  if (!cachedDb) {
    await cachedClient.connect();
    cachedDb = cachedClient.db(MONGODB_DB);
  }

  return cachedDb;
}

// Obtiene un token de Dropbox válido. Si hay refresh token configurado,
// se usa el flujo oficial de Dropbox para generar siempre un token nuevo.
// Si no, se usa directamente DROPBOX_ACCESS_TOKEN (como antes).
async function getDropboxAccessToken(forceRefresh = false) {
  const now = Date.now();

  // Reutilizar token en caché si aún no ha caducado y no forzamos refresh
  if (!forceRefresh && cachedDropboxAccessToken && now < cachedDropboxExpiresAt - 60_000) {
    return cachedDropboxAccessToken;
  }

  const refresh = dropboxRefreshToken.value && dropboxRefreshToken.value();
  const appKey = dropboxAppKey.value && dropboxAppKey.value();
  const appSecret = dropboxAppSecret.value && dropboxAppSecret.value();

  // Si no tenemos datos para refresh, usar el token fijo (modo anterior)
  if (!refresh || !appKey || !appSecret) {
    const token = dropboxToken.value && dropboxToken.value();
    if (!token) {
      logger.warn("DROPBOX_ACCESS_TOKEN no configurado");
      throw new Error("DROPBOX_ACCESS_TOKEN no configurado. Por favor, configura el token de Dropbox.");
    }
    cachedDropboxAccessToken = token;
    // Token fijo: sin caducidad conocida, poner una fecha muy lejana
    cachedDropboxExpiresAt = now + 30 * 24 * 60 * 60 * 1000;
    return token;
  }

  // Renovar token usando refresh_token
  logger.info("Refrescando token de Dropbox usando refresh_token");
  const basicAuth = Buffer.from(`${appKey}:${appSecret}`).toString("base64");

  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refresh)}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Error al refrescar el token de Dropbox", {
      status: response.status,
      errorText,
    });
    throw new Error("No se pudo refrescar el token de Dropbox. Revisa los secrets de la app.");
  }

  const data = await response.json();
  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 14_400; // 4h por defecto

  cachedDropboxAccessToken = accessToken;
  cachedDropboxExpiresAt = Date.now() + (expiresIn - 60) * 1000; // refrescar 1 min antes

  logger.info("Token de Dropbox refrescado correctamente", {
    expiresIn,
  });

  return accessToken;
}

// Elimina un archivo de Dropbox si existe. Si no existe, no bloquea la operación.
async function deleteDropboxFileIfExists(dropboxPath, context = {}) {
  if (!dropboxPath) {
    return {deleted: false, skipped: true};
  }

  try {
    const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
    const response = await fetch("https://api.dropboxapi.com/2/files/delete_v2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({path: dropboxPath}),
    });

    if (response.ok) {
      const result = await response.json();
      logger.info("Archivo eliminado de Dropbox", {
        dropboxPath,
        ...context,
      });
      return {deleted: true, result};
    }

    const errorText = await response.text();
    let errorSummary = "";
    try {
      const errorJson = JSON.parse(errorText);
      errorSummary = errorJson.error_summary || "";
    } catch (e) {
      // ignore parse error
    }

    if (errorSummary.includes("path/not_found")) {
      logger.warn("Archivo no encontrado en Dropbox, se continúa con la eliminación", {
        dropboxPath,
        ...context,
      });
      return {deleted: false, notFound: true};
    }

    logger.error("Error al eliminar archivo en Dropbox", {
      dropboxPath,
      errorText,
      errorSummary,
      ...context,
    });
    return {deleted: false, error: errorSummary || errorText};
  } catch (error) {
    logger.error("Error en deleteDropboxFileIfExists", {
      dropboxPath,
      error: error.message,
      stack: error.stack,
      ...context,
    });
    return {deleted: false, error: error.message};
  }
}

function withCors(handler) {
  return async (req, res) => {
    // Obtener el origen de la solicitud
    const origin = req.headers.origin || req.headers.Origin || req.get("origin") || req.get("Origin");
    
    // Lista de orígenes permitidos (incluyendo el dominio de producción)
    const allowedOrigins = [
      "https://moval-fff66.web.app",
      "https://moval-fff66.firebaseapp.com",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5000",
    ];
    
    // Determinar el origen permitido
    let allowedOrigin = "*";
    if (ALLOWED_ORIGINS && ALLOWED_ORIGINS !== "*") {
      allowedOrigin = ALLOWED_ORIGINS;
    } else if (origin && allowedOrigins.includes(origin)) {
      allowedOrigin = origin;
    } else if (origin) {
      // Permitir cualquier origen si ALLOWED_ORIGINS es "*"
      allowedOrigin = origin;
    }

    // Establecer headers CORS SIEMPRE primero, antes de cualquier otra operación
    // Usar res.set() que es el método estándar de Express
    res.set("Access-Control-Allow-Origin", allowedOrigin);
    res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Max-Age", "3600");

    // Manejar solicitudes OPTIONS (preflight) - DEBE retornar antes de cualquier otra cosa
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    
    // Asegurar que los headers CORS estén establecidos antes de ejecutar el handler
    // Esto es importante porque algunos handlers pueden sobrescribir los headers

    try {
      await handler(req, res);
    } catch (error) {
      logger.error("Unhandled error", {error: error.message, stack: error.stack});
      // Asegurarse de que los headers CORS estén establecidos incluso en errores
      if (!res.headersSent) {
        // Re-establecer headers CORS antes de enviar el error
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

function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === "object") return body;
  try {
    return JSON.parse(body);
  } catch (error) {
    return {};
  }
}

// Crear informe de Testigos
exports.createWitnessReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  const normalizeWitnessTypes = (value) => {
    if (Array.isArray(value)) {
      return value.filter((item) => item && String(item).trim() !== "");
    }
    if (typeof value === "string" && value.trim() !== "") {
      return [value.trim()];
    }
    return [];
  };

  const witnessTypes = normalizeWitnessTypes(payload.tipoTestigo);

  if (!employeeId || !payload.fecha || !payload.hora || witnessTypes.length === 0) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id, fecha, hora y tipoTestigo son obligatorios",
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(WITNESS_REPORTS_COLLECTION);
  const now = new Date();

  // Subir firma si viene incluida
  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeEmployee = String(employeeId).replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeEmployee}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "TESTIGOS",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de testigos a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const reportText = `REGISTRO DE TESTIGOS
====================

Empleado: ${employeeId}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

Tipo de testigo: ${witnessTypes.join(", ")}
Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoTestigo: witnessTypes,
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    firmaNombreResponsable: payload.firmaNombreResponsable || null,
    firmaResponsableInfo,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Witness report created", {
    employeeId,
    reportId: result.insertedId,
  });

  setCorsHeaders(req, res);
  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Registro de Testigos creado correctamente",
  });
}));

// Listar informes de Testigos
exports.listWitnessReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(WITNESS_REPORTS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoTestigo: report.tipoTestigo,
      firmaNombreEmpleado: report.firmaNombreEmpleado,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

// Crear informe de Libro de visitas
exports.createVisitorsBookReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  if (!employeeId || !payload.fecha || !payload.horaEntrada || !payload.nombreApellidos || !payload.empresa || !payload.motivoVisita) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id, fecha, horaEntrada, nombreApellidos, empresa y motivoVisita son obligatorios",
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(VISITORS_BOOK_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(payload.nombreApellidos || "VISITA").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "LIBRO DE VISITAS",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de libro de visitas a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const reportText = `LIBRO DE VISITAS
=================

Empleado que registra: ${employeeId}
Fecha: ${payload.fecha}
Hora entrada: ${payload.horaEntrada}
Hora salida: ${payload.horaSalida || "N/A"}

Nombre y apellidos: ${payload.nombreApellidos}
DNI: ${payload.dni || "N/A"}
Empresa: ${payload.empresa}
Motivo de la visita: ${payload.motivoVisita}
Ha leído normas: ${payload.haLeidoNormas || "N/A"}
Firma visitante: ${payload.firmaNombreVisitante || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    horaEntrada: payload.horaEntrada,
    horaSalida: payload.horaSalida || null,
    nombreApellidos: payload.nombreApellidos,
    dni: payload.dni || null,
    empresa: payload.empresa,
    motivoVisita: payload.motivoVisita,
    haLeidoNormas: payload.haLeidoNormas || null,
    firmaNombreVisitante: payload.firmaNombreVisitante || null,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Visitors book report created", {
    employeeId,
    reportId: result.insertedId,
  });

  setCorsHeaders(req, res);
  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Registro de Libro de visitas creado correctamente",
  });
}));

// Listar informes de Libro de visitas
exports.listVisitorsBookReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(VISITORS_BOOK_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      horaEntrada: report.horaEntrada,
      horaSalida: report.horaSalida,
      nombreApellidos: report.nombreApellidos,
      empresa: report.empresa,
      motivoVisita: report.motivoVisita,
      haLeidoNormas: report.haLeidoNormas,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

// Guardar borrador del Libro de Visitas (similar a saveWeightDraft)
exports.saveVisitorsBookDraft = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  if (!employeeId || !payload.fecha || !payload.horaEntrada || !payload.nombreApellidos) {
    res.status(400).json({error: "MISSING_FIELDS", message: "employee_id, fecha, horaEntrada y nombreApellidos son obligatorios"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(VISITORS_BOOK_COLLECTION);
  const now = new Date();

  const entry = {
    fecha: payload.fecha,
    horaEntrada: payload.horaEntrada,
    horaSalida: payload.horaSalida || null,
    nombreApellidos: payload.nombreApellidos,
    dni: payload.dni || null,
    empresa: payload.empresa || null,
    motivoVisita: payload.motivoVisita || null,
    haLeidoNormas: payload.haLeidoNormas || null,
    firmaNombreVisitante: payload.firmaNombreVisitante || null,
    firmaImagenBase64: payload.firmaImagenBase64 || null,
    createdAt: now,
  };

  let existing = null;
  if (payload.draftId) {
    try { existing = await collection.findOne({_id: new ObjectId(payload.draftId)}); } catch (err) { res.status(400).json({error: "INVALID_ID", message: "draftId inválido"}); return; }
  }

  if (!existing) {
    existing = await collection.findOne({employee_id: String(employeeId).trim(), completo: false}, {sort: {updatedAt: -1}});
  }

  if (existing) {
    await collection.updateOne({_id: existing._id}, {$set: {
      fecha: payload.fecha,
      horaEntrada: payload.horaEntrada,
      horaSalida: payload.horaSalida || null,
      nombreApellidos: payload.nombreApellidos,
      dni: payload.dni || null,
      empresa: payload.empresa || null,
      motivoVisita: payload.motivoVisita || null,
      haLeidoNormas: payload.haLeidoNormas || null,
      firmaNombreVisitante: payload.firmaNombreVisitante || null,
      firmaImagenBase64: payload.firmaImagenBase64 || null,
      datosCompletos: payload,
      completo: false,
      updatedAt: now,
    }, $push: {entradas: entry}});
    res.json({id: existing._id, success: true, message: "Borrador de Libro de visitas guardado correctamente"});
    return;
  }

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    horaEntrada: payload.horaEntrada,
    horaSalida: payload.horaSalida || null,
    nombreApellidos: payload.nombreApellidos,
    dni: payload.dni || null,
    empresa: payload.empresa || null,
    motivoVisita: payload.motivoVisita || null,
    haLeidoNormas: payload.haLeidoNormas || null,
    firmaNombreVisitante: payload.firmaNombreVisitante || null,
    firmaImagenBase64: payload.firmaImagenBase64 || null,
    entradas: [entry],
    completo: false,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true, message: "Borrador de Libro de visitas guardado correctamente"});
}));

// Obtener borrador pendiente del Libro de Visitas
exports.getPendingVisitorsBookReport = onRequest(withCors(async (req, res) => {
  const employeeId = req.query.employeeId || req.query.employee_id || req.query.usuario;
  if (!employeeId) { res.status(400).json({error: "MISSING_FIELDS", message: "employeeId es obligatorio"}); return; }

  const db = await getDb();
  const collection = db.collection(VISITORS_BOOK_COLLECTION);
  const pending = await collection.findOne({employee_id: String(employeeId).trim(), completo: false}, {sort: {updatedAt: -1}});

  if (!pending) { res.json({pending: false}); return; }

  res.json({ pending: true, report: {
    id: pending._id,
    employee_id: pending.employee_id,
    fecha: pending.fecha,
    horaEntrada: pending.horaEntrada,
    horaSalida: pending.horaSalida || null,
    nombreApellidos: pending.nombreApellidos,
    dni: pending.dni || null,
    empresa: pending.empresa || null,
    motivoVisita: pending.motivoVisita || null,
    haLeidoNormas: pending.haLeidoNormas || null,
    firmaNombreVisitante: pending.firmaNombreVisitante || null,
    firmaImagenBase64: pending.firmaImagenBase64 || null,
    entradas: pending.entradas || [],
    completo: pending.completo === true,
    createdAt: pending.createdAt,
    updatedAt: pending.updatedAt,
  }});
}));

// Crear informe de Recepción y salida mercancía
exports.createReceptionExitReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  const requiredFields = [
    "employee_id",
    "tipoMovimiento",
    "empresa",
    "nombreTransportista",
    "fecha",
    "producto",
    "identificacionProducto",
    "estadoCajas",
    "higieneCamion",
    "estadoPalets",
    "aceptado",
    "quienRecepciona",
    "nombreConductor",
  ];

  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length > 0) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: `Faltan campos obligatorios: ${missing.join(", ")}`,
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(RECEPTION_EXIT_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(payload.nombreConductor || "CONDUCTOR").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "RECEPCION Y SALIDA MERCANCIA",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de recepción/salida mercancía a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const reportText = `RECEPCIÓN Y SALIDA MERCANCÍA
===============================

Empleado que registra: ${employeeId}
Tipo movimiento: ${payload.tipoMovimiento}
Empresa: ${payload.empresa}
Transportista: ${payload.nombreTransportista}
DNI / Matrícula: ${payload.dniMatricula || "N/A"}
Fecha: ${payload.fecha}
Hora: ${payload.hora || "N/A"}
Producto: ${payload.producto}
Número albarán: ${payload.numeroAlbaran || "N/A"}
Identificación producto: ${payload.identificacionProducto}

Estado de las cajas: ${payload.estadoCajas}
Bultos: ${payload.bultos || "N/A"}
Palets: ${payload.palets || "N/A"}
Temperatura (ºC): ${payload.temperatura || "N/A"}
Higiene del camión: ${payload.higieneCamion}
Estado de los palets: ${payload.estadoPalets}
Aceptado: ${payload.aceptado}
Quién recepciona: ${payload.quienRecepciona}
Nombre conductor: ${payload.nombreConductor}
Firma conductor imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    tipoMovimiento: payload.tipoMovimiento,
    empresa: payload.empresa,
    nombreTransportista: payload.nombreTransportista,
    dniMatricula: payload.dniMatricula || null,
    fecha: payload.fecha,
    hora: payload.hora || null,
    producto: payload.producto,
    identificacionProducto: payload.identificacionProducto,
    estadoCajas: payload.estadoCajas,
    bultos: payload.bultos || null,
    palets: payload.palets || null,
    temperatura: payload.temperatura || null,
    higieneCamion: payload.higieneCamion,
    estadoPalets: payload.estadoPalets,
    aceptado: payload.aceptado,
    quienRecepciona: payload.quienRecepciona,
    nombreConductor: payload.nombreConductor,
    numeroAlbaran: payload.numeroAlbaran || null,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Reception/Exit report created", {
    employeeId,
    reportId: result.insertedId,
  });

  setCorsHeaders(req, res);
  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Registro de Recepción y salida de mercancía creado correctamente",
  });
}));

// Listar informes de Recepción y salida mercancía
exports.listReceptionExitReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(RECEPTION_EXIT_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      tipoMovimiento: report.tipoMovimiento,
      empresa: report.empresa,
      nombreTransportista: report.nombreTransportista,
      dniMatricula: report.dniMatricula,
      bultos: report.bultos,
      palets: report.palets,
      temperatura: report.temperatura,
      hora: report.hora,
      fecha: report.fecha,
      producto: report.producto,
      identificacionProducto: report.identificacionProducto,
      estadoCajas: report.estadoCajas,
      higieneCamion: report.higieneCamion,
      estadoPalets: report.estadoPalets,
      aceptado: report.aceptado,
      quienRecepciona: report.quienRecepciona,
      nombreConductor: report.nombreConductor,
      numeroAlbaran: report.numeroAlbaran || null,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

// Eliminar informe de Testigos
exports.deleteWitnessReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(WITNESS_REPORTS_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_testigos"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Witness report deleted", {reportId: id});
  res.json({success: true, message: "Informe eliminado correctamente", id});
}));

// Eliminar informe de Libro de visitas
exports.deleteVisitorsBookReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(VISITORS_BOOK_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_libro_visitas"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Visitors book report deleted", {reportId: id});
  res.json({success: true, message: "Informe eliminado correctamente", id});
}));

// Eliminar informe de Recepción y salida mercancía
exports.deleteReceptionExitReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(RECEPTION_EXIT_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_recepcion_salida"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Reception/Exit report deleted", {reportId: id});
  res.json({success: true, message: "Informe eliminado correctamente", id});
}));

// Crear informe de Control de Residuos
exports.createControlResiduesReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  if (!employeeId || !payload.fecha || !payload.hora || payload.paletsCarton === undefined ||
      payload.paletsPlastico === undefined || payload.paletsFilm === undefined || !payload.nombreResponsable) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id, fecha, hora, paletsCarton, paletsPlastico, paletsFilm y nombreResponsable son obligatorios",
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_RESIDUES_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(payload.nombreResponsable || "RESPONSABLE").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "CONTROL DE RESIDUOS",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de control de residuos a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const reportText = `CONTROL DE RESIDUOS
=====================

Empleado que registra: ${employeeId}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

Palets cartón: ${payload.paletsCarton}
Palets plástico: ${payload.paletsPlastico}
Palets film: ${payload.paletsFilm}
Nombre responsable: ${payload.nombreResponsable}
Firma responsable: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    paletsCarton: payload.paletsCarton,
    paletsPlastico: payload.paletsPlastico,
    paletsFilm: payload.paletsFilm,
    nombreResponsable: payload.nombreResponsable,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Control residues report created", {
    employeeId,
    reportId: result.insertedId,
  });

  setCorsHeaders(req, res);
  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Control de residuos creado correctamente",
  });
}));

// Listar informes de Control de Residuos
exports.listControlResiduesReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(CONTROL_RESIDUES_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      paletsCarton: report.paletsCarton,
      paletsPlastico: report.paletsPlastico,
      paletsFilm: report.paletsFilm,
      nombreResponsable: report.nombreResponsable,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

// Crear informe de Control Agua Diario
exports.createControlAguaDiarioReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  const requiredFields = ["fecha", "hora", "temperaturaCalentador", "cloroDeposito", "phDeposito"];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (!employeeId || missing.length > 0) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id y los campos obligatorios son requeridos",
      missing,
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_DIARIO_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(employeeId || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "CONTROL AGUA/DIARIO",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de control agua diario a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const reportText = `CONTROL AGUA DIARIO
====================

Empleado: ${employeeId}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

Temperatura calentador (≥60ºC): ${payload.temperaturaCalentador}
Cloro depósito (0,2-1 PPM): ${payload.cloroDeposito}
pH depósito (6,5-8,5): ${payload.phDeposito}

Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoInforme: "CONTROL_AGUA_DIARIO",
    temperaturaCalentador: payload.temperaturaCalentador,
    cloroDeposito: payload.cloroDeposito,
    phDeposito: payload.phDeposito,
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Control agua diario report created", {
    employeeId,
    reportId: result.insertedId,
  });

  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Control agua diario creado correctamente",
  });
}));

// Listar informes de Control Agua Diario
exports.listControlAguaDiarioReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_DIARIO_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoInforme: report.tipoInforme,
      temperaturaCalentador: report.temperaturaCalentador,
      cloroDeposito: report.cloroDeposito,
      phDeposito: report.phDeposito,
      firmaNombreEmpleado: report.firmaNombreEmpleado || null,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );

  res.json(enriched);
}));

// Eliminar informe de Control Agua Diario
exports.deleteControlAguaDiarioReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_DIARIO_COLLECTION);
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_control_agua_diario"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Control agua diario report deleted", {reportId: id});
  res.json({success: true, message: "Informe eliminado correctamente", id});
}));

// Crear informe de Control Agua Semanal
exports.createControlAguaSemanalReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  const requiredFields = ["fecha", "hora", "turbidezCalentador", "turbidezDeposito", "purgaPuntos", "turbidezPuntos"];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (!employeeId || missing.length > 0) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id y los campos obligatorios son requeridos",
      missing,
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_SEMANAL_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(employeeId || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "CONTROL AGUA/SEMANAL",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de control agua semanal a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const reportText = `CONTROL AGUA SEMANAL
====================

Empleado: ${employeeId}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

Turbidez calentador (<4 UNF): ${payload.turbidezCalentador}
Turbidez depósito (<4 UNF): ${payload.turbidezDeposito}
Purga puntos poco uso (Tº en purga ≥ 50 ºC): ${payload.purgaPuntos}
Turbidez puntos terminales (<4 UNF): ${payload.turbidezPuntos}

Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoInforme: "CONTROL_AGUA_SEMANAL",
    turbidezCalentador: payload.turbidezCalentador,
    turbidezDeposito: payload.turbidezDeposito,
    purgaPuntos: payload.purgaPuntos,
    turbidezPuntos: payload.turbidezPuntos,
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Control agua semanal report created", {
    employeeId,
    reportId: result.insertedId,
  });

  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Control agua semanal creado correctamente",
  });
}));

// Listar informes de Control Agua Semanal
exports.listControlAguaSemanalReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_SEMANAL_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoInforme: report.tipoInforme,
      turbidezCalentador: report.turbidezCalentador,
      turbidezDeposito: report.turbidezDeposito,
      purgaPuntos: report.purgaPuntos,
      turbidezPuntos: report.turbidezPuntos,
      firmaNombreEmpleado: report.firmaNombreEmpleado || null,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );

  res.json(enriched);
}));

// Eliminar informe de Control Agua Semanal
exports.deleteControlAguaSemanalReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_SEMANAL_COLLECTION);
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_control_agua_semanal"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Control agua semanal report deleted", {reportId: id});
  res.json({success: true, message: "Informe eliminado correctamente", id});
}));

// Crear informe de Control Agua Mensual
exports.createControlAguaMensualReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  const requiredFields = ["fecha", "hora", "suciedadCorrosion", "tempFria", "tempCaliente", "cloroPuntos"];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (!employeeId || missing.length > 0) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id y los campos obligatorios son requeridos",
      missing,
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_MENSUAL_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(employeeId || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "CONTROL AGUA/MENSUAL",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de control agua mensual a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const reportText = `CONTROL AGUA MENSUAL
====================

Empleado: ${employeeId}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

Suciedad o corrosión: ${payload.suciedadCorrosion}
Tº < 20 ºC (fría): ${payload.tempFria}
Tº ≥ 50 ºC (caliente): ${payload.tempCaliente}
Cloro 0,2-1: ${payload.cloroPuntos}

Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoInforme: "CONTROL_AGUA_MENSUAL",
    suciedadCorrosion: payload.suciedadCorrosion,
    tempFria: payload.tempFria,
    tempCaliente: payload.tempCaliente,
    cloroPuntos: payload.cloroPuntos,
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Control agua mensual report created", {
    employeeId,
    reportId: result.insertedId,
  });

  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Control agua mensual creado correctamente",
  });
}));

// Listar informes de Control Agua Mensual
exports.listControlAguaMensualReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_MENSUAL_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoInforme: report.tipoInforme,
      suciedadCorrosion: report.suciedadCorrosion,
      tempFria: report.tempFria,
      tempCaliente: report.tempCaliente,
      cloroPuntos: report.cloroPuntos,
      firmaNombreEmpleado: report.firmaNombreEmpleado || null,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );

  res.json(enriched);
}));

// Crear informe de Control Agua Trimestral
exports.createControlAguaTrimestralReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  const requiredFields = ["fecha", "hora", "suciedadCorrosion"];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (!employeeId || missing.length > 0) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id y los campos obligatorios son requeridos",
      missing,
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_TRIMESTRAL_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(employeeId || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "CONTROL AGUA/TRIMESTRAL",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de control agua trimestral a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const reportText = `CONTROL AGUA TRIMESTRAL
=======================

Empleado: ${employeeId}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

Suciedad o corrosión: ${payload.suciedadCorrosion}

Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoInforme: "CONTROL_AGUA_TRIMESTRAL",
    suciedadCorrosion: payload.suciedadCorrosion,
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Control agua trimestral report created", {
    employeeId,
    reportId: result.insertedId,
  });

  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Control agua trimestral creado correctamente",
  });
}));

// Listar informes de Control Agua Trimestral
exports.listControlAguaTrimestralReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_TRIMESTRAL_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoInforme: report.tipoInforme,
      suciedadCorrosion: report.suciedadCorrosion,
      firmaNombreEmpleado: report.firmaNombreEmpleado || null,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );

  res.json(enriched);
}));

// Eliminar informe de Control Agua Trimestral
exports.deleteControlAguaTrimestralReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_TRIMESTRAL_COLLECTION);
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_control_agua_trimestral"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Control agua trimestral report deleted", {reportId: id});
  res.json({success: true, message: "Informe eliminado correctamente", id});
}));

// Eliminar informe de Control Agua Mensual
exports.deleteControlAguaMensualReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_MENSUAL_COLLECTION);
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_control_agua_mensual"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Control agua mensual report deleted", {reportId: id});
  res.json({success: true, message: "Informe eliminado correctamente", id});
}));

// Crear informe de Control de Expedición
exports.createControlExpeditionReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  const requiredFields = [
    "fecha",
    "hora",
    "producto",
    "lote",
    "numeroPalet",
    "paletIntegro",
    "flejadoOK",
    "etiquetaCorrecta",
    "conteoCorrecto",
    "responsable",
  ];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (!employeeId || missing.length > 0) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id y los campos obligatorios son requeridos",
      missing,
    });
    return;
  }

  const numeroPalet = Number(payload.numeroPalet);
  if (Number.isNaN(numeroPalet)) {
    res.status(400).json({
      error: "INVALID_NUMERO_PALET",
      message: "El número de palet debe ser numérico",
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_EXPEDICION_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(payload.responsable || "RESPONSABLE").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "CONTROL EXPEDICION",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de control de expedición a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const reportText = `CONTROL DE EXPEDICIÓN
======================

Empleado que registra: ${employeeId}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

Producto: ${payload.producto}
Lote: ${payload.lote}
Número palet: ${numeroPalet}
Cajas sueltas: ${payload.cajasSueltas || 0}
Palet íntegro: ${payload.paletIntegro}
Flejado OK: ${payload.flejadoOK}
Etiqueta correcta: ${payload.etiquetaCorrecta}
Conteo correcto: ${payload.conteoCorrecto}
Responsable: ${payload.responsable}
Firma responsable: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    producto: payload.producto,
    lote: payload.lote,
    numeroPalet,
    cajasSueltas: Number(payload.cajasSueltas) || 0,
    paletIntegro: payload.paletIntegro,
    flejadoOK: payload.flejadoOK,
    etiquetaCorrecta: payload.etiquetaCorrecta,
    conteoCorrecto: payload.conteoCorrecto,
    responsable: payload.responsable,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Control expedition report created", {
    employeeId,
    reportId: result.insertedId,
  });

  setCorsHeaders(req, res);
  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Control de expedición creado correctamente",
  });
}));

// Listar informes de Control de Expedición
exports.listControlExpeditionReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(CONTROL_EXPEDICION_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      producto: report.producto,
      lote: report.lote,
      numeroPalet: report.numeroPalet,
      cajasSueltas: report.cajasSueltas,
      paletIntegro: report.paletIntegro,
      flejadoOK: report.flejadoOK,
      etiquetaCorrecta: report.etiquetaCorrecta,
      conteoCorrecto: report.conteoCorrecto,
      responsable: report.responsable,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

exports.createCustomerSatisfactionForm = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {
    cliente,
    contacto,
    email,
    telefono,
    canal,
    fecha,
    firmaNombreCliente,
    firmaImagenBase64,
    scores = {},
    valoras,
    mejoras,
    comentarios,
  } = payload;

  if (!cliente || !canal || !fecha || !firmaNombreCliente || !firmaImagenBase64) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "cliente, canal, fecha, firmaNombreCliente y firmaImagenBase64 son obligatorios",
    });
    return;
  }

  const numericScores = Object.values(scores)
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));
  const isg = numericScores.length > 0
    ? Number((numericScores.reduce((acc, v) => acc + v, 0) / numericScores.length).toFixed(2))
    : null;

  const now = new Date();
  let firmaInfo = null;
  try {
    const fechaForName = (fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
    const safeName = String(firmaNombreCliente || "CLIENTE").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
    const fileName = `${fechaForName}_${safeName}.png`;
    const dropboxResult = await uploadFormularioSignatureFromDataUrl(
      firmaImagenBase64,
      fileName,
      "SATISFACCION CLIENTES",
    );
    const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
    const sharedLink = dropboxPath
      ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
      : "";
    firmaInfo = {
      uploaded: true,
      name: fileName,
      dropboxPath,
      dropboxId: dropboxResult.id,
      sharedLink,
    };
  } catch (error) {
    logger.error("Error subiendo firma de satisfacción cliente a Dropbox", {
      error: error.message,
    });
    firmaInfo = {
      uploaded: false,
      error: error.message,
    };
  }

  const doc = {
    cliente,
    contacto: contacto || "",
    email: email || "",
    telefono: telefono || "",
    canal,
    fecha,
    firmaNombreCliente,
    firmaInfo,
    scores,
    isg,
    valoras: valoras || "",
    mejoras: mejoras || "",
    comentarios: comentarios || "",
    texto: `ENCUESTA DE SATISFACCIÓN DEL CLIENTE
===============================
Cliente: ${cliente}
Contacto: ${contacto || "N/A"}
Canal: ${canal}
Fecha: ${fecha}
ISG: ${isg ?? "N/A"}
Valoración destacada: ${valoras || "N/A"}
Aspectos a mejorar: ${mejoras || "N/A"}
Comentarios adicionales: ${comentarios || "N/A"}
Firma cliente: ${firmaNombreCliente}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}
Fecha de creación: ${now.toISOString()}`,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  const collection = db.collection(SATISFACTION_FORMS_COLLECTION);
  const result = await collection.insertOne(doc);

  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Encuesta registrada correctamente",
  });
}));

exports.listCustomerSatisfactionForms = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200"} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(SATISFACTION_FORMS_COLLECTION);

  const forms = await collection
      .find({})
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    forms.map(async (form) => ({
      id: form._id,
      cliente: form.cliente,
      contacto: form.contacto,
      email: form.email,
      telefono: form.telefono,
      canal: form.canal,
      fecha: form.fecha,
      firmaNombreCliente: form.firmaNombreCliente,
      firmaInfo: await ensureSharedLink(collection, form._id, form.firmaInfo),
      scores: form.scores,
      isg: form.isg,
      valoras: form.valoras,
      mejoras: form.mejoras,
      comentarios: form.comentarios,
      texto: form.texto,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
    })),
  );
  res.json(enriched);
}));

exports.updateCustomerSatisfactionForm = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del formulario"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(SATISFACTION_FORMS_COLLECTION);
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Formulario no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.cliente !== undefined) updateFields.cliente = payload.cliente;
  if (payload.contacto !== undefined) updateFields.contacto = payload.contacto;
  if (payload.email !== undefined) updateFields.email = payload.email;
  if (payload.telefono !== undefined) updateFields.telefono = payload.telefono;
  if (payload.canal !== undefined) updateFields.canal = payload.canal;
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.valoras !== undefined) updateFields.valoras = payload.valoras;
  if (payload.mejoras !== undefined) updateFields.mejoras = payload.mejoras;
  if (payload.comentarios !== undefined) updateFields.comentarios = payload.comentarios;
  if (payload.firmaNombreCliente !== undefined) updateFields.firmaNombreCliente = payload.firmaNombreCliente;
  if (payload.scores !== undefined) updateFields.scores = payload.scores;

  if (updateFields.scores) {
    const numericScores = Object.values(updateFields.scores)
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value));
    updateFields.isg = numericScores.length > 0
      ? Number((numericScores.reduce((acc, v) => acc + v, 0) / numericScores.length).toFixed(2))
      : null;
  }

  updateFields.texto = `ENCUESTA DE SATISFACCIÓN DEL CLIENTE
===============================
Cliente: ${updateFields.cliente || existing.cliente}
Contacto: ${updateFields.contacto || existing.contacto || "N/A"}
Canal: ${updateFields.canal || existing.canal}
Fecha: ${updateFields.fecha || existing.fecha}
ISG: ${updateFields.isg ?? existing.isg ?? "N/A"}
Valoración destacada: ${updateFields.valoras || existing.valoras || "N/A"}
Aspectos a mejorar: ${updateFields.mejoras || existing.mejoras || "N/A"}
Comentarios adicionales: ${updateFields.comentarios || existing.comentarios || "N/A"}
Firma cliente: ${updateFields.firmaNombreCliente || existing.firmaNombreCliente || "N/A"}
Firma imagen: ${existing.firmaInfo && existing.firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}
Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  await collection.updateOne({_id: new ObjectId(id)}, {$set: updateFields});
  const updated = await collection.findOne({_id: new ObjectId(id)});

  res.json({
    id: updated._id,
    cliente: updated.cliente,
    contacto: updated.contacto,
    email: updated.email,
    telefono: updated.telefono,
    canal: updated.canal,
    fecha: updated.fecha,
    firmaNombreCliente: updated.firmaNombreCliente,
    firmaInfo: updated.firmaInfo,
    scores: updated.scores,
    isg: updated.isg,
    valoras: updated.valoras,
    mejoras: updated.mejoras,
    comentarios: updated.comentarios,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

exports.deleteCustomerSatisfactionForm = onRequest(withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del formulario"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(SATISFACTION_FORMS_COLLECTION);
  const result = await collection.deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Formulario no encontrado"});
    return;
  }

  res.json({success: true, message: "Formulario eliminado correctamente", id});
}));

exports.exportWeeklyControlSummary = onSchedule({schedule: "0 23 * * 0", timeZone: "Europe/Madrid"}, async () => {
  const formatDateForFile = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().split("T")[0];
  };

  const getWeekRange = (referenceDate = new Date()) => {
    const date = new Date(referenceDate);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return {start: monday, end: sunday};
  };

  const parseReportDate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const buildDeviationDetails = (reports, predicate) => {
    const deviated = reports.filter(predicate);
    const details = deviated.map((report) => {
      const fecha = report.fecha || "";
      const hora = report.hora || "";
      const empleado = report.employee_id || "";
      return `${fecha} ${hora} ${empleado}`.trim();
    });
    return {count: deviated.length, details};
  };

  const {start, end} = getWeekRange();
  const db = await getDb();

  const fetchReports = async (collectionName) => {
    const collection = db.collection(collectionName);
    const reports = await collection.find({createdAt: {$gte: start, $lte: end}}).toArray();
    return reports.filter((report) => {
      const reportDate = parseReportDate(report.fecha);
      return reportDate && reportDate >= start && reportDate <= end;
    });
  };

  const [
    initialReportsWeek,
    productionReportsWeek,
    weightReportsWeek,
    witnessReportsWeek,
    cleaningReportsWeek,
    cleaningPlantReportsWeek,
    packagingReportsWeek,
    controlExpeditionReportsWeek,
  ] = await Promise.all([
    fetchReports(INITIAL_REPORTS_COLLECTION),
    fetchReports(PRODUCTION_REPORTS_COLLECTION),
    fetchReports(WEIGHT_REPORTS_COLLECTION),
    fetchReports(WITNESS_REPORTS_COLLECTION),
    fetchReports(CLEANING_REPORTS_COLLECTION),
    fetchReports(CLEANING_PLANT_REPORTS_COLLECTION),
    fetchReports(PACKAGING_REPORTS_COLLECTION),
    fetchReports(CONTROL_EXPEDICION_COLLECTION),
  ]);

  const initialDeviation = buildDeviationDetails(initialReportsWeek, (report) => (
    report.instalacionesLimpias === "NO" ||
    report.manipuladoresUniformados === "NO" ||
    report.peloProtegido === "NO" ||
    report.unasLimpias === "NO" ||
    report.elementosTamiz === "NO" ||
    report.calibracionPHMetro === "NO"
  ));

  const packagingDeviation = buildDeviationDetails(packagingReportsWeek, (report) => (
    report.checklist?.paradasEmergencia === "NO" ||
    report.checklist?.integridadBoquillas === "NO" ||
    report.checklist?.fechaLoteImpresos === "NO" ||
    report.checklist?.fechaLoteLegibles === "NO" ||
    report.checklist?.envasesCierran === "NO" ||
    report.checklist?.etiquetaCorrecta === "NO" ||
    report.checklist?.unidadesCaja === "NO" ||
    report.paradasEmergencia === "NO" ||
    report.integridadBoquillas === "NO" ||
    report.fechaLoteImpresos === "NO" ||
    report.fechaLoteLegibles === "NO" ||
    report.envasesCierran === "NO" ||
    report.etiquetaCorrecta === "NO" ||
    report.unidadesCaja === "NO"
  ));

  const controlExpeditionDeviation = buildDeviationDetails(controlExpeditionReportsWeek, (report) => (
    report.paletIntegro === "NO" ||
    report.flejadoOK === "NO" ||
    report.etiquetaCorrecta === "NO" ||
    report.conteoCorrecto === "NO"
  ));

  const productionDeviation = buildDeviationDetails(productionReportsWeek, (report) => {
    const noAceptable = [
      report.color,
      report.olor,
      report.sabor,
      report.textura,
    ].some((value) => value === "NO_ACEPTABLE");
    const tipoProducto = report.tipoProducto || "";
    const limitePh = tipoProducto === "MAYONESA" ? 4.2 : 4.4;
    const phValue = Number(report.phPcc2);
    const phAlto = !Number.isNaN(phValue) && phValue > limitePh;
    return noAceptable || phAlto;
  });

  const witnessDeviation = buildDeviationDetails(witnessReportsWeek, (report) => {
    const selected = Array.isArray(report.tipoTestigo) ? report.tipoTestigo : [];
    return !selected.includes("FE") || !selected.includes("INOX") || !selected.includes("NO_INOX");
  });

  const normalizeEnvase = (value) => String(value || "").toUpperCase().replace(/\s+/g, " ").trim();
  const getWeightAverage = (report) => {
    if (report.promedio !== undefined && report.promedio !== null) {
      const num = Number(report.promedio);
      return Number.isNaN(num) ? NaN : num;
    }
    if (report.resumenPesos && report.resumenPesos.promedio !== undefined) {
      const num = Number(report.resumenPesos.promedio);
      return Number.isNaN(num) ? NaN : num;
    }
    return NaN;
  };
  const weightTargets = {
    "165 ML": 165,
    "200 ML": 200,
    "2000 ML": 2000,
    "3600 ML": 3600,
  };
  const isSmallEnvase = (envase) => envase === "165 ML" || envase === "200 ML";
  const isLargeEnvase = (envase) => envase === "2000 ML" || envase === "3600 ML";

  const buildWeightDeviation = (reports, tolerance) => {
    const deviated = [];
    reports.forEach((report) => {
      const envase = normalizeEnvase(report.envaseCantidad);
      const target = weightTargets[envase];
      const promedio = getWeightAverage(report);
      if (!target || Number.isNaN(promedio)) return;
      const diffRatio = Math.abs(promedio - target) / target;
      if (diffRatio > tolerance) {
        deviated.push({
          ...report,
          _envase: envase,
          _promedio: promedio,
        });
      }
    });
    const details = deviated.map((report) => {
      const fecha = report.fecha || "";
      const hora = report.hora || "";
      const empleado = report.employee_id || "";
      return `${fecha} ${hora} ${empleado} (${report._envase}=${report._promedio})`.trim();
    });
    return {count: deviated.length, details};
  };

  const weightSmallReports = weightReportsWeek.filter((report) => isSmallEnvase(normalizeEnvase(report.envaseCantidad)));
  const weightLargeReports = weightReportsWeek.filter((report) => isLargeEnvase(normalizeEnvase(report.envaseCantidad)));
  const weightSmallDeviation = buildWeightDeviation(weightSmallReports, 0.045);
  const weightLargeDeviation = buildWeightDeviation(weightLargeReports, 0.015);

  const rows = [
    {area: "Control inicial planta", registros: initialReportsWeek.length, desviaciones: initialDeviation},
    {area: "PCC2 – pH", registros: productionReportsWeek.length, desviaciones: productionDeviation},
    {area: "Control de pesos 1,9 kg", registros: weightLargeReports.length, desviaciones: weightLargeDeviation},
    {area: "Control de pesos 165 g", registros: weightSmallReports.length, desviaciones: weightSmallDeviation},
    {area: "Control testigos detector metales", registros: witnessReportsWeek.length, desviaciones: witnessDeviation},
    {area: "Control limpieza", registros: cleaningReportsWeek.length, desviaciones: {count: 0, details: []}},
    {area: "Limpieza planta", registros: cleaningPlantReportsWeek.length, desviaciones: {count: 0, details: []}},
    {area: "Control almacenado palets", registros: controlExpeditionReportsWeek.length, desviaciones: controlExpeditionDeviation},
    {area: "Control envasado", registros: packagingReportsWeek.length, desviaciones: packagingDeviation},
  ];

  const totalDesviaciones = rows.reduce((acc, row) => acc + row.desviaciones.count, 0);
  const estadoGlobal = totalDesviaciones > 0 ? "NO CONFORME" : "SIN DESVIACIONES";

  const tableRows = rows.map((row) => {
    const detalles = row.desviaciones.details.join("; ");
    const desviacionesValue = row.desviaciones.count === 0
      ? "0"
      : `${row.desviaciones.count}${detalles ? ` (${detalles})` : ""}`;
    return [
      row.area,
      row.registros,
      desviacionesValue,
      row.desviaciones.count > 0 ? "NO CONFORME" : "CONFORME",
    ];
  });

  const headerSemana = `${formatDateForFile(start)} – ${formatDateForFile(end)}`;
  const sheetData = [
    ["DASHBOARD SEMANAL CONTROL PRODUCCIÓN", "", "", "", "LOTE", ""],
    ["Semana", headerSemana, "", "", "FEC. CAD.", ""],
    ["Responsable revisión", "", "", "", "", ""],
    [""],
    ["ÁREA CONTROLADA", "Registros real", "Desviaciones de", "Estado"],
    ...tableRows,
    [""],
    ["TOTAL DESVIACIONES SEMANALES", totalDesviaciones],
    ["ESTADO GLOBAL DEL SISTEMA", estadoGlobal],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet["!cols"] = [
    {wch: 36},
    {wch: 24},
    {wch: 50},
    {wch: 18},
    {wch: 12},
    {wch: 18},
  ];
  worksheet["!merges"] = [
    {s: {r: 0, c: 0}, e: {r: 0, c: 3}},
    {s: {r: 1, c: 1}, e: {r: 1, c: 3}},
    {s: {r: 2, c: 1}, e: {r: 2, c: 3}},
  ];
  for (let C = 0; C <= 3; C++) {
    const address = XLSX.utils.encode_cell({c: C, r: 4});
    if (worksheet[address]) {
      worksheet[address].s = {
        fill: {patternType: "solid", fgColor: {rgb: "012B5C"}},
        font: {color: {rgb: "FFFFFF"}, bold: true},
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Control semanal");
  const buffer = XLSX.write(workbook, {type: "buffer", bookType: "xlsx"});
  const fileName = `control_semanal_${formatDateForFile(end)}.xlsx`;
  await uploadFormularioFileBuffer(buffer, fileName, "CONTROL SEMANAL");

  logger.info("Control semanal exportado automáticamente", {
    fileName,
    totalDesviaciones,
    start: start.toISOString(),
    end: end.toISOString(),
  });
});

// Función para parsear FormData (usando busboy para multipart/form-data)
function parseFormData(stream) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];

    const bb = busboy({
      headers: stream.headers,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB límite por archivo
      },
    });

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("file", (name, file, info) => {
      const {filename, encoding, mimeType} = info;
      const chunks = [];
      file.on("data", (data) => {
        chunks.push(data);
      });
      file.on("end", () => {
        files.push({
          name,
          filename,
          encoding,
          mimeType,
          buffer: Buffer.concat(chunks),
        });
      });
      file.on("error", (err) => {
        reject(err);
      });
    });

    bb.on("finish", () => {
      resolve({fields, files});
    });

    bb.on("error", (err) => {
      reject(err);
    });

    stream.pipe(bb);
  });
}

// Función para subir archivos a Dropbox (registro herramientas)
async function uploadToDropbox(fileBuffer, fileName, folderName) {
  // Ruta base común
  const BASE_PATH = "/SISTEMAS 2021/MOVAL FOODS/3. RRPP Y APPCC/6. MANTENIMIENTO Y EQUIPOS DE MEDICION/REGISTRO CONTROL DE HERRAMIENTAS";
  const BASE_PATH_HERRAMIENTAS = `${BASE_PATH}/HERRAMIENTAS DE ENVASADORAS`;
  const BASE_PATH_MANTENIMIENTO = `${BASE_PATH}/MANTENIMIENTO EXTERNO`;
  
  let dropboxPath;
  
  // Rutas especiales para carpetas de firmas por sección
  if (folderName === "FIRMAS_HERRAMIENTAS_ENVASADORAS") {
    // Firma dentro de la sección HERRAMIENTAS DE ENVASADORAS
    dropboxPath = `${BASE_PATH_HERRAMIENTAS}/FIRMAS/${fileName}`;
  } else if (folderName === "FIRMAS_MANTENIMIENTO_EXTERNO") {
    // Firma dentro de la sección MANTENIMIENTO EXTERNO
    dropboxPath = `${BASE_PATH_MANTENIMIENTO}/FIRMAS/${fileName}`;
  } else if (folderName === "FIRMAS") {
    // Ruta genérica de firmas (fallback, por compatibilidad)
    dropboxPath = `${BASE_PATH}/FIRMAS/${fileName}`;
  } else if (folderName === "MANTENIMIENTO EXTERNO") {
    // Fotos dentro de la sección MANTENIMIENTO EXTERNO (nivel raíz de la sección)
    dropboxPath = `${BASE_PATH_MANTENIMIENTO}/${fileName}`;
  } else {
    // Mapear nombres de carpetas para herramientas (dentro de HERRAMIENTAS DE ENVASADORAS)
    const folderMap = {
      "CAJA COMUN": "CAJA COMUN",
      "ENVASADORA 2000 ML": "ENVASADORA 2000 ML",
      "ENVASADORA 3600": "ENVASADORA 3600",
      "ENVASADORA TARRINAS": "ENVASADORA TARRINAS",
    };

    // Construir la ruta completa: BASE_PATH_HERRAMIENTAS/[CARPETA]/[archivo]
    const folderPath = folderMap[folderName] || "";
    dropboxPath = `${BASE_PATH_HERRAMIENTAS}/${folderPath}/${fileName}`;
  }
  
  logger.info("Subiendo archivo a Dropbox", {
    folderName,
    dropboxPath,
    fileName,
    basePath: BASE_PATH,
  });

  try {
    const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: dropboxPath,
          mode: "add",
          autorename: true,
          mute: false,
        }),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Error al subir a Dropbox (${response.status}): ${errorText}`;
      let isExpiredToken = false;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error_summary) {
          errorMessage = `Error al subir a Dropbox: ${errorJson.error_summary}`;
          if (typeof errorJson.error_summary === "string" &&
              errorJson.error_summary.includes("expired_access_token")) {
            isExpiredToken = true;
          }
        }
      } catch (e) {
        // Si no se puede parsear, usar el texto original
      }

      // Si el token ha caducado e incluso con refresh ha fallado,
      // intentar refrescar forzando y reintentar UNA sola vez.
      if (isExpiredToken) {
        logger.warn("Token de Dropbox caducado al subir archivo. Forzando refresh y reintentando...", {
          dropboxPath,
          fileName,
        });
        try {
          const refreshedToken = await getDropboxAccessToken(true);
          const retryResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${refreshedToken}`,
              "Content-Type": "application/octet-stream",
              "Dropbox-API-Arg": JSON.stringify({
                path: dropboxPath,
                mode: "add",
                autorename: true,
                mute: false,
              }),
            },
            body: fileBuffer,
          });

          if (retryResponse.ok) {
            const retryResult = await retryResponse.json();
            logger.info("Archivo subido correctamente tras refrescar token", {
              fileName,
              dropboxPath: retryResult.path_display || dropboxPath,
              fileId: retryResult.id,
            });
            return retryResult;
          }

          const retryErrorText = await retryResponse.text();
          logger.error("Error al subir a Dropbox incluso después de refrescar token", {
            status: retryResponse.status,
            statusText: retryResponse.statusText,
            retryErrorText,
            dropboxPath,
            fileName,
          });
        } catch (retryError) {
          logger.error("Fallo al refrescar token de Dropbox y reintentar subida", {
            error: retryError.message,
            stack: retryError.stack,
            dropboxPath,
            fileName,
          });
        }
      }

      logger.error("Error en respuesta de Dropbox", {
        status: response.status,
        statusText: response.statusText,
        errorText,
        dropboxPath,
        fileName,
      });
      throw new Error(errorMessage);
    }

    const result = await response.json();
    logger.info("Archivo subido exitosamente a Dropbox", {
      fileName,
      dropboxPath: result.path_display || dropboxPath,
      fileId: result.id,
    });
    return result;
  } catch (error) {
    logger.error("Error en uploadToDropbox", {
      error: error.message,
      stack: error.stack,
      fileName,
      dropboxPath,
      folderName,
    });
    throw error;
  }
}

// Función específica para subir firmas de formularios (ENVASADO, INICIAL, etc.)
async function uploadFormularioSignatureFromDataUrl(dataUrl, fileName, formularioFolder) {
  const BASE_PATH_FORMULARIOS = "/SISTEMAS 2021/MOVAL FOODS/FORMULARIOS";
  const dropboxPath = `${BASE_PATH_FORMULARIOS}/${formularioFolder}/FIRMAS/${fileName}`;

  // dataUrl tiene formato "data:image/png;base64,AAAA..."
  const base64Part = (dataUrl || "").split(",")[1];
  if (!base64Part) {
    throw new Error("Firma en formato base64 inválido");
  }

  const fileBuffer = Buffer.from(base64Part, "base64");

  logger.info("Subiendo firma de formulario a Dropbox", {
    formularioFolder,
    dropboxPath,
    fileName,
  });

  try {
    const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: dropboxPath,
          mode: "add",
          autorename: true,
          mute: false,
        }),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let isExpiredToken = false;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error_summary &&
            typeof errorJson.error_summary === "string" &&
            errorJson.error_summary.includes("expired_access_token")) {
          isExpiredToken = true;
        }
      } catch (e) {
        // ignore parse error
      }

      if (isExpiredToken) {
        logger.warn("Token de Dropbox caducado al subir firma de formulario. Forzando refresh y reintentando...", {
          dropboxPath,
          fileName,
          formularioFolder,
        });
        try {
          const refreshedToken = await getDropboxAccessToken(true);
          const retryResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${refreshedToken}`,
              "Content-Type": "application/octet-stream",
              "Dropbox-API-Arg": JSON.stringify({
                path: dropboxPath,
                mode: "add",
                autorename: true,
                mute: false,
              }),
            },
            body: fileBuffer,
          });

          if (retryResponse.ok) {
            const retryResult = await retryResponse.json();
            const retryPath = retryResult.path_display || dropboxPath;
            const sharedLink = await createDropboxSharedLink(retryPath);
            logger.info("Firma de formulario subida correctamente tras refrescar token", {
              fileName,
              dropboxPath: retryPath,
              fileId: retryResult.id,
            });
            return { ...retryResult, sharedLink };
          }

          const retryErrorText = await retryResponse.text();
          logger.error("Error subiendo firma de formulario a Dropbox incluso después de refrescar token", {
            status: retryResponse.status,
            statusText: retryResponse.statusText,
            retryErrorText,
            dropboxPath,
            fileName,
            formularioFolder,
          });
        } catch (retryError) {
          logger.error("Fallo al refrescar token de Dropbox y reintentar subida de firma", {
            error: retryError.message,
            stack: retryError.stack,
            dropboxPath,
            fileName,
            formularioFolder,
          });
        }
      }

      logger.error("Error subiendo firma de formulario a Dropbox", {
        status: response.status,
        statusText: response.statusText,
        errorText,
        dropboxPath,
        fileName,
      });
      throw new Error("No se pudo subir la firma a Dropbox");
    }

    const result = await response.json();
    const resultPath = result.path_display || dropboxPath;
    
    let sharedLink = "";
    try {
      sharedLink = await createDropboxSharedLink(resultPath);
    } catch (linkError) {
      logger.warn("No se pudo crear enlace compartido para la firma, pero el archivo se subió correctamente", {
        error: linkError.message,
        dropboxPath: resultPath,
        fileName,
      });
      // Crear enlace manual como fallback
      sharedLink = `https://www.dropbox.com/home${encodeURI(resultPath)}`;
    }
    
    logger.info("Firma de formulario subida correctamente a Dropbox", {
      fileName,
      dropboxPath: resultPath,
      fileId: result.id,
    });
    return { ...result, sharedLink };
  } catch (error) {
    logger.error("Error en uploadFormularioSignatureFromDataUrl", {
      error: error.message,
      stack: error.stack,
      fileName,
      dropboxPath,
      formularioFolder,
    });
    throw error;
  }
}

// Variante para subir la firma del responsable en subcarpeta "FIRMAS RESPONSABLE"
async function uploadFormularioSignatureResponsableFromDataUrl(dataUrl, fileName, formularioFolder) {
  const BASE_PATH_FORMULARIOS = "/SISTEMAS 2021/MOVAL FOODS/FORMULARIOS";
  const dropboxPath = `${BASE_PATH_FORMULARIOS}/${formularioFolder}/FIRMAS RESPONSABLE/${fileName}`;

  const base64Part = (dataUrl || "").split(",")[1];
  if (!base64Part) {
    throw new Error("Firma en formato base64 inválido");
  }

  const fileBuffer = Buffer.from(base64Part, "base64");

  logger.info("Subiendo firma responsable de formulario a Dropbox", {
    formularioFolder,
    dropboxPath,
    fileName,
  });

  try {
    const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: dropboxPath,
          mode: "add",
          autorename: true,
          mute: false,
        }),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let isExpiredToken = false;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error_summary && typeof errorJson.error_summary === "string" && errorJson.error_summary.includes("expired_access_token")) {
          isExpiredToken = true;
        }
      } catch (e) {
        // ignore parse error
      }

      if (isExpiredToken) {
        logger.warn("Token de Dropbox caducado al subir firma responsable. Forzando refresh y reintentando...", {
          dropboxPath,
          fileName,
          formularioFolder,
        });
        try {
          const refreshedToken = await getDropboxAccessToken(true);
          const retryResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${refreshedToken}`,
              "Content-Type": "application/octet-stream",
              "Dropbox-API-Arg": JSON.stringify({
                path: dropboxPath,
                mode: "add",
                autorename: true,
                mute: false,
              }),
            },
            body: fileBuffer,
          });

          if (retryResponse.ok) {
            const retryResult = await retryResponse.json();
            const retryPath = retryResult.path_display || dropboxPath;
            const sharedLink = await createDropboxSharedLink(retryPath);
            logger.info("Firma responsable subida correctamente tras refrescar token", {
              fileName,
              dropboxPath: retryPath,
              fileId: retryResult.id,
            });
            return { ...retryResult, sharedLink };
          }

          const retryErrorText = await retryResponse.text();
          logger.error("Error subiendo firma responsable incluso después de refrescar token", {
            status: retryResponse.status,
            statusText: retryResponse.statusText,
            retryErrorText,
            dropboxPath,
            fileName,
            formularioFolder,
          });
        } catch (retryError) {
          logger.error("Fallo al refrescar token de Dropbox y reintentar subida de firma responsable", {
            error: retryError.message,
            stack: retryError.stack,
            dropboxPath,
            fileName,
            formularioFolder,
          });
        }
      }

      logger.error("Error subiendo firma responsable a Dropbox", {
        status: response.status,
        statusText: response.statusText,
        errorText,
        dropboxPath,
        fileName,
      });
      throw new Error("No se pudo subir la firma responsable a Dropbox");
    }

    const result = await response.json();
    const resultPath = result.path_display || dropboxPath;

    let sharedLink = "";
    try {
      sharedLink = await createDropboxSharedLink(resultPath);
    } catch (linkError) {
      logger.warn("No se pudo crear enlace compartido para la firma responsable, pero el archivo se subió correctamente", {
        error: linkError.message,
        dropboxPath: resultPath,
        fileName,
      });
      sharedLink = `https://www.dropbox.com/home${encodeURI(resultPath)}`;
    }

    logger.info("Firma responsable subida correctamente a Dropbox", {
      fileName,
      dropboxPath: resultPath,
      fileId: result.id,
    });
    return { ...result, sharedLink };
  } catch (error) {
    logger.error("Error en uploadFormularioSignatureResponsableFromDataUrl", {
      error: error.message,
      stack: error.stack,
      fileName,
      dropboxPath,
      formularioFolder,
    });
    throw error;
  }
}

async function createDropboxSharedLink(dropboxPath) {
  const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
  try {
    const shareResponse = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: dropboxPath,
        settings: {
          requested_visibility: "public",
          audience: "public",
          access: "viewer",
        },
      }),
    });

    if (shareResponse.ok) {
      const shareResult = await shareResponse.json();
      return shareResult.url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
    }

    const errorText = await shareResponse.text();
    logger.warn("No se pudo crear enlace compartido para la firma", {
      status: shareResponse.status,
      errorText,
      dropboxPath,
    });
    
    // Si falla por permisos, intentar con list_shared_links
    if (shareResponse.status === 403 || errorText.includes("not permitted") || errorText.includes("scope")) {
      try {
        const listResponse = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: dropboxPath,
            direct_only: true,
          }),
        });
        if (listResponse.ok) {
          const listResult = await listResponse.json();
          if (listResult.links && listResult.links.length > 0) {
            return listResult.links[0].url
              .replace("www.dropbox.com", "dl.dropboxusercontent.com")
              .replace("?dl=0", "");
          }
        }
      } catch (listError) {
        logger.warn("Error obteniendo enlace compartido existente", {
          error: listError.message,
          dropboxPath,
        });
      }
    }
  } catch (error) {
    logger.warn("Error creando enlace compartido para la firma", {
      error: error.message,
      dropboxPath,
    });
  }

  return ""; // Retornar vacío en lugar de tirar excepción
}

async function ensureSharedLink(collection, reportId, firmaInfo, fieldName = "firmaInfo") {
  if (!firmaInfo || firmaInfo.sharedLink || !firmaInfo.dropboxPath) {
    return firmaInfo;
  }
  const sharedLink = await createDropboxSharedLink(firmaInfo.dropboxPath);
  if (!sharedLink) {
    return firmaInfo;
  }
  
  // Actualizar el documento con el enlace compartido
  await collection.updateOne(
    { _id: reportId },
    { 
      $set: { 
        [`${fieldName}.sharedLink`]: sharedLink,
        updatedAt: new Date()
      } 
    }
  );
  
  return { ...firmaInfo, sharedLink };
}

function sanitizeUser(userDoc) {
  const username = userDoc.usuario || userDoc.username;
  const normalizedUsername =
    typeof username === "string" ? username.toLowerCase() : "";
  const derivedRole =
    userDoc.rol ||
    userDoc.role ||
    (normalizedUsername === "admin"
      ? "admin"
      : normalizedUsername === "informes"
        ? "informes"
        : "user");

  return {
    id: userDoc._id,
    usuario: username,
    nombre: userDoc.nombre || userDoc.name || username,
    rol: derivedRole,
  };
}

exports.healthCheck = onRequest(withCors(async (_req, res) => {
  res.json({status: "ok", timestamp: new Date().toISOString()});
}));

exports.createEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = (
    payload.employee_id ||
    payload.employeeId ||
    payload.usuario
  );
  const note = payload.notes || payload.note || "";
  if (!employeeId) {
    res.status(400).json({error: "EMPLOYEE_REQUIRED"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);
  const now = new Date();
  const normalizedId = String(employeeId).trim();
  const doc = {
    employee_id: normalizedId,
    date: now.toISOString().slice(0, 10),
    check_in: now,
    check_out: null,
    worked_hours: null,
    status: "incompleto",
    notes: note,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Entry created", {employeeId, entryId: result.insertedId});

  res.status(201).json({
    id: result.insertedId,
    ...doc,
  });
}));

exports.completeEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = (
    payload.employee_id ||
    payload.employeeId ||
    payload.usuario
  );
  if (!employeeId) {
    res.status(400).json({error: "EMPLOYEE_REQUIRED"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);

  const normalizedId = String(employeeId).trim();
  const existing = await collection.findOne(
      {
        $and: [
          {
            $or: [
              {employee_id: normalizedId},
              {employee_id: employeeId},
            ],
          },
          {
            $or: [
              {status: "incompleto"},
              {check_out: null},
              {check_out: {$exists: false}},
            ],
          },
        ],
      },
      {sort: {check_in: -1}},
  );
  if (!existing) {
    logger.warn("Entry not found for complete", {
      employeeId,
      normalizedId,
    });
    res.status(404).json({error: "ENTRY_NOT_FOUND"});
    return;
  }

  const endTime = new Date();
  const hours = Math.max(
      0,
      (endTime.getTime() - new Date(existing.check_in).getTime()) / 3_600_000,
  );
  const workedHours = Math.round(hours * 100) / 100;

  const update = await collection.findOneAndUpdate(
      {_id: new ObjectId(existing._id)},
      {
        $set: {
          check_out: endTime,
          worked_hours: workedHours,
          status: "completo",
          updatedAt: endTime,
        },
      },
      {returnDocument: "after"},
  );

  if (!update || !update.value) {
    logger.warn("Update returned no value, verifying manually", {
      entryId: existing._id,
    });
    const verified = await collection.findOne({
      _id: new ObjectId(existing._id),
    });
    if (!verified || !verified.check_out) {
      res.status(500).json({error: "UPDATE_FAILED"});
      return;
    }
    res.json({
      id: verified._id,
      employee_id: verified.employee_id,
      date: verified.date,
      check_in: verified.check_in,
      check_out: verified.check_out,
      worked_hours: verified.worked_hours,
      status: verified.status,
      notes: verified.notes,
    });
    return;
  }

  res.json({
    id: update.value._id,
    employee_id: update.value.employee_id,
    date: update.value.date,
    check_in: update.value.check_in,
    check_out: update.value.check_out,
    worked_hours: update.value.worked_hours,
    status: update.value.status,
    notes: update.value.notes,
  });
}));

exports.listEntries = onRequest(withCors(async (req, res) => {
  const {employeeId, limit = "20"} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 20, 100);

  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const records = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  res.json(records.map((record) => ({
    id: record._id,
    employee_id: record.employee_id,
    date: record.date,
    check_in: record.check_in,
    check_out: record.check_out,
    worked_hours: record.worked_hours,
    status: record.status,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })));
}));

exports.getStats = onRequest(withCors(async (_req, res) => {
  const db = await getDb();
  const recordsCollection = db.collection(RECORDS_COLLECTION);
  const usersCollection = db.collection(USERS_COLLECTION);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayFilter = {
    $or: [
      {date: today.toISOString().split("T")[0]},
      {check_in: {$gte: today, $lt: tomorrow}},
    ],
  };

  const [allUsers, todayRecords, pendingRecords] = await Promise.all([
    usersCollection.countDocuments({}),
    recordsCollection
        .find({...todayFilter, status: "completo"})
        .toArray(),
    recordsCollection.countDocuments({
      $or: [
        {check_out: null},
        {check_out: {$exists: false}},
      ],
    }),
  ]);

  const totalHoursToday = todayRecords.reduce(
      (sum, record) => sum + (record.worked_hours || 0),
      0,
  );

  res.json({
    activeEmployees: allUsers,
    hoursToday: Math.round(totalHoursToday * 100) / 100,
    pending: pendingRecords,
  });
}));

exports.login = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const username = payload.usuario || payload.username;
  const password = payload["contraseña"] || payload.password;
  if (!username || !password) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "Usuario y contraseña son requeridos",
    });
    return;
  }

  try {
    const db = await getDb();
    const collection = db.collection(USERS_COLLECTION);
    const userDoc = await collection.findOne({
      $or: [{usuario: username}, {username}],
    });

    if (!userDoc) {
      logger.warn("Login attempt failed: user not found", {username});
      res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Usuario o contraseña incorrectos",
      });
      return;
    }

    let isValid = false;
    if (userDoc.passwordHash) {
      isValid = await bcrypt.compare(password, userDoc.passwordHash);
      logger.info("Login attempt", {
        username,
        hasPasswordHash: true,
        isValid,
      });
    } else if (typeof userDoc["contraseña"] === "string") {
      isValid = userDoc["contraseña"] === password;
      logger.info("Login attempt", {
        username,
        hasPlainPassword: true,
        isValid,
      });
    } else if (typeof userDoc.password === "string") {
      isValid = userDoc.password === password;
      logger.info("Login attempt", {
        username,
        hasPasswordField: true,
        isValid,
      });
    } else {
      logger.warn("Login attempt failed: no password field found", {
        username,
        userDocKeys: Object.keys(userDoc),
      });
    }

    if (!isValid) {
      logger.warn("Login attempt failed: invalid password", {username});
      res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Usuario o contraseña incorrectos",
      });
      return;
    }

    logger.info("Login successful", {username, userId: userDoc._id});
    res.json({user: sanitizeUser(userDoc)});
  } catch (error) {
    logger.error("Login error", {
      error: error.message,
      stack: error.stack,
      username,
    });
    res.status(500).json({
      error: "LOGIN_ERROR",
      message: "Error al procesar el login. Por favor, intente nuevamente.",
    });
  }
}));

exports.createUser = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  if (!ADMIN_SETUP_TOKEN) {
    res.status(500).json({
      error: "CONFIG",
      message: "ADMIN_SETUP_TOKEN no configurado",
    });
    return;
  }

  const token = req.get("x-setup-token");
  if (token !== ADMIN_SETUP_TOKEN) {
    res.status(403).json({error: "UNAUTHORIZED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const username = payload.usuario || payload.username;
  const password = payload["contraseña"] || payload.password;
  const nombre = payload.nombre || payload.name || "";
  const rol = payload.rol || payload.role || "user";

  if (!username || !password) {
    res.status(400).json({error: "MISSING_FIELDS"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(USERS_COLLECTION);
  const exists = await collection.findOne({
    $or: [{usuario: username}, {username}],
  });
  if (exists) {
    res.status(409).json({error: "USER_EXISTS"});
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await collection.insertOne({
    usuario: username,
    passwordHash,
    nombre,
    rol,
    createdAt: new Date(),
  });

  logger.info("User created", {username});
  res.status(201).json({
    user: sanitizeUser({
      _id: result.insertedId,
      usuario: username,
      nombre,
      rol,
    }),
  });
}));

exports.createToolReport = onRequest(
    {
      secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret],
    },
    withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  let payload = {};
  let files = [];

  try {
    // Detectar si es FormData o JSON
    const contentType = req.get("content-type") || "";
    logger.info("Content-Type recibido:", contentType);
    
    if (contentType.includes("multipart/form-data")) {
      try {
        logger.info("Procesando FormData...");
        logger.info("Request body type:", typeof req.body);
        logger.info("Has rawBody:", !!req.rawBody);

        // En Firebase Functions v2, necesitamos leer el body completo primero
        let bodyData;
        if (req.rawBody) {
          // En el runtime actual, rawBody ya es un Buffer con los bytes reales
          // No debemos volver a decodificarlo como base64 porque corrompería el multipart
          bodyData = Buffer.isBuffer(req.rawBody)
            ? req.rawBody
            : Buffer.from(req.rawBody);
        } else if (Buffer.isBuffer(req.body)) {
          bodyData = req.body;
        } else {
          // Si no hay rawBody, intentar leer del stream
          bodyData = await new Promise((resolve, reject) => {
            const chunks = [];
            req.on("data", (chunk) => chunks.push(chunk));
            req.on("end", () => resolve(Buffer.concat(chunks)));
            req.on("error", reject);
          });
        }

        // Crear un stream desde el buffer para busboy
        const {Readable} = require("stream");
        const stream = Readable.from(bodyData);
        stream.headers = req.headers;

        const parsed = await parseFormData(stream);
        payload = parsed.fields;
        files = parsed.files;
        logger.info("FormData parseado correctamente", {
          fieldsCount: Object.keys(payload).length,
          filesCount: files.length,
        });
      } catch (error) {
        logger.error("Error parsing FormData", {
          error: error.message,
          stack: error.stack,
        });
        res.status(400).json({
          error: "INVALID_FORM_DATA",
          message: "Error al procesar el formulario: " + error.message,
        });
        return;
      }
    } else {
      payload = normalizeBody(req.body);
      logger.info("Procesando JSON body");
    }
  } catch (error) {
    logger.error("Error inicial procesando request", {error: error.message, stack: error.stack});
    res.status(500).json({error: "PROCESSING_ERROR", message: "Error al procesar la petición: " + error.message});
    return;
  }

  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  
  if (!employeeId) {
    res.status(400).json({error: "EMPLOYEE_REQUIRED"});
    return;
  }

  // Validar que todos los campos requeridos estén presentes
  const requiredFields = [
    "fecha",
    "hora",
    "tipoRegistro",
    "checklistEntrada",
    "checklistSalida",
    "noConformidad",
  ];

  const missingFields = requiredFields.filter((field) => !payload[field]);
  
  // Validar campos condicionales
  if (payload.tipoRegistro === "MANTENIMIENTO_EXTERNO" && !payload.empresaTecnico) {
    missingFields.push("empresaTecnico");
  }
  if (payload.tipoRegistro === "HERRAMIENTAS_ENVASADORAS" && !payload.kit) {
    missingFields.push("kit");
  }

  // Separar fotos y firma
  const fotos = files.filter((f) => f.name === "fotos");
  const firma = files.find((f) => f.name === "firma");

  if (fotos.length === 0) {
    missingFields.push("fotos");
  }

  if (missingFields.length > 0) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: `Campos requeridos faltantes: ${missingFields.join(", ")}`,
      missingFields,
    });
    return;
  }

  // Subir fotos a Dropbox
  const uploadedFiles = [];
  // Determinar la carpeta automáticamente según el tipo de registro y kit
  let carpetaDropbox = null;
  
  if (payload.tipoRegistro === "MANTENIMIENTO_EXTERNO") {
    // Para mantenimiento externo, usar la carpeta MANTENIMIENTO EXTERNO
    carpetaDropbox = "MANTENIMIENTO EXTERNO";
  } else if (payload.tipoRegistro === "HERRAMIENTAS_ENVASADORAS" && payload.kit) {
    // Para herramientas envasadoras, usar la carpeta asociada al kit
    const kitFolderMap = {
      "KIT_1_ENVASADORA_3.6_KG": "ENVASADORA 3600",
      "KIT_2_ENVASADORA_2_KG": "ENVASADORA 2000 ML",
      "KIT_3_ENVASADORA_TARRINAS": "ENVASADORA TARRINAS",
      "KIT_4_CAJA_COMUN": "CAJA COMUN",
    };
    carpetaDropbox = kitFolderMap[payload.kit] || null;
    logger.info("Carpeta Dropbox obtenida del kit", {
      kit: payload.kit,
      carpetaDropbox,
    });
  }
  
  logger.info("Preparando subida de fotos a Dropbox", {
    fotosCount: fotos.length,
    carpetaDropbox,
    kit: payload.kit,
    hasToken: !!dropboxToken.value(),
    tipoRegistro: payload.tipoRegistro,
  });
  
  // Formatear la fecha del formulario para el nombre del archivo
  // La fecha viene en formato YYYY-MM-DD, convertirla a DD-MM-YYYY
  const formatDateForFileName = (dateString) => {
    if (!dateString) {
      // Si no hay fecha, usar la fecha actual
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      return `${day}-${month}-${year}`;
    }
    // Convertir YYYY-MM-DD a DD-MM-YYYY
    const [year, month, day] = dateString.split("-");
    return `${day}-${month}-${year}`;
  };

  const fechaFormateada = formatDateForFileName(payload.fecha);
  
  // Función auxiliar para obtener el nombre de la empresa/kit para el archivo
  const getEmpresaNameForFile = (tipoRegistro, kit, empresaTecnico) => {
    if (tipoRegistro === "MANTENIMIENTO_EXTERNO" && empresaTecnico) {
      // Para mantenimiento externo, usar el nombre de la empresa/técnico
      return empresaTecnico.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30).toUpperCase();
    } else if (tipoRegistro === "HERRAMIENTAS_ENVASADORAS" && kit) {
      // Para herramientas envasadoras, usar el nombre del kit
      const kitMap = {
        "KIT_1_ENVASADORA_3.6_KG": "ENVASADORA_3600",
        "KIT_2_ENVASADORA_2_KG": "ENVASADORA_2000",
        "KIT_3_ENVASADORA_TARRINAS": "TARRINAS",
        "KIT_4_CAJA_COMUN": "CAJA_COMUN",
      };
      return kitMap[kit] || kit.replace(/KIT_\d+_/g, "").replace(/_/g, "_");
    }
    return "SIN_EMPRESA";
  };
  
  // Subir firma a Dropbox si existe
  let firmaSubida = null;
  if (firma) {
    logger.info("Firma detectada, preparando subida", {
      firmaName: firma.name,
      firmaFilename: firma.filename,
      firmaSize: firma.buffer ? firma.buffer.length : 0,
      firmaMimeType: firma.mimeType,
    });
    try {
      const hasToken = !!dropboxToken.value();
      if (hasToken) {
        logger.info("Iniciando subida de firma a Dropbox", {
          hasToken: true,
          kit: payload.kit,
          empresaTecnico: payload.empresaTecnico,
        });
        const empresaName = getEmpresaNameForFile(payload.tipoRegistro, payload.kit, payload.empresaTecnico);
        const firmaFileName = `${fechaFormateada}_${empresaName}.png`;

        // Determinar la carpeta de firmas según la sección (tipo de registro)
        let firmaFolderName = "FIRMAS";
        if (payload.tipoRegistro === "HERRAMIENTAS_ENVASADORAS") {
          firmaFolderName = "FIRMAS_HERRAMIENTAS_ENVASADORAS";
        } else if (payload.tipoRegistro === "MANTENIMIENTO_EXTERNO") {
          firmaFolderName = "FIRMAS_MANTENIMIENTO_EXTERNO";
        }

        logger.info("Llamando a uploadToDropbox para firma", {
          fileName: firmaFileName,
          folderName: firmaFolderName,
          bufferSize: firma.buffer ? firma.buffer.length : 0,
          tipoRegistro: payload.tipoRegistro,
        });
        
        const firmaResult = await uploadToDropbox(
          firma.buffer,
          firmaFileName,
          firmaFolderName,
        );
        
        // Crear un enlace temporal compartido para la firma
        let sharedLink = null;
        try {
          const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
          const shareResponse = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
              body: JSON.stringify({
                path: firmaResult.path_display,
                settings: {
                  requested_visibility: "public",
                  audience: "public",
                  access: "viewer",
                },
              }),
          });
          
          if (shareResponse.ok) {
            const shareResult = await shareResponse.json();
            // Convertir el enlace compartido a un enlace directo de imagen
            sharedLink = shareResult.url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
            logger.info("Enlace compartido creado para la firma", {
              sharedLink,
              originalUrl: shareResult.url,
            });
          } else {
            const errorText = await shareResponse.text();
            logger.warn("No se pudo crear enlace compartido para la firma", {
              status: shareResponse.status,
              errorText,
            });
            // Intentar obtener el enlace compartido existente si ya existe
            try {
              const getLinkResponse = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                  "Content-Type": "application/json",
                },
              body: JSON.stringify({
                path: firmaResult.path_display,
                direct_only: true,
              }),
              });
              if (getLinkResponse.ok) {
                const linkResult = await getLinkResponse.json();
                if (linkResult.links && linkResult.links.length > 0) {
                  const existingLink = linkResult.links[0].url;
                  sharedLink = existingLink.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
                  logger.info("Enlace compartido existente encontrado para la firma", { sharedLink });
                }
              }
            } catch (getLinkError) {
              logger.warn("Error obteniendo enlace compartido existente", { error: getLinkError.message });
            }
          }
        } catch (shareError) {
          logger.warn("Error creando enlace compartido para la firma", {
            error: shareError.message,
          });
        }
        
        if (!sharedLink) {
          const firmaPath = firmaResult.path_display || firmaResult.path_lower || "";
          sharedLink = firmaPath
            ? `https://www.dropbox.com/home${encodeURI(firmaPath)}`
            : "";
        }
        firmaSubida = {
          name: firmaFileName,
          originalName: firma.filename,
          dropboxPath: firmaResult.path_display,
          dropboxId: firmaResult.id,
          uploaded: true,
          sharedLink: sharedLink,
        };
        logger.info("Firma subida correctamente a Dropbox", {
          fileName: firmaFileName,
          dropboxPath: firmaSubida.dropboxPath,
          dropboxId: firmaSubida.dropboxId,
          hasSharedLink: !!sharedLink,
          fullPath: firmaResult.path_display,
        });
        // Verificar que el archivo realmente existe en Dropbox
        try {
          const verifyResponse = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: firmaResult.path_display,
            }),
          });
          if (verifyResponse.ok) {
            const metadata = await verifyResponse.json();
            logger.info("Firma verificada en Dropbox", {
              path: metadata.path_display,
              size: metadata.size,
              id: metadata.id,
            });
          } else {
            logger.error("No se pudo verificar la firma en Dropbox", {
              status: verifyResponse.status,
            });
          }
        } catch (verifyError) {
          logger.error("Error verificando firma en Dropbox", {
            error: verifyError.message,
          });
        }
      } else {
        logger.warn("DROPBOX_ACCESS_TOKEN no configurado. La firma no se subirá a Dropbox.");
        const empresaName = getEmpresaNameForFile(payload.tipoRegistro, payload.kit, payload.empresaTecnico);
        firmaSubida = {
          name: `${fechaFormateada}_${empresaName}.png`,
          originalName: firma.filename,
          dropboxPath: null,
          dropboxId: null,
          uploaded: false,
          error: "DROPBOX_ACCESS_TOKEN no configurado",
        };
      }
    } catch (error) {
      logger.error("Error subiendo firma a Dropbox", {
        error: error.message,
        stack: error.stack,
        firmaName: firma.name,
        firmaFilename: firma.filename,
        firmaSize: firma.buffer ? firma.buffer.length : 0,
      });
      const empresaName = getEmpresaNameForFile(payload.tipoRegistro, payload.kit, payload.empresaTecnico);
      firmaSubida = {
        name: `${fechaFormateada}_${empresaName}.png`,
        originalName: firma.filename,
        dropboxPath: null,
        dropboxId: null,
        uploaded: false,
        error: error.message,
      };
    }
  } else {
    logger.warn("No se detectó firma en el FormData", {
      filesCount: files.length,
      fileNames: files.map(f => f.name),
    });
  }
  
  // Intentar subir fotos a Dropbox si hay fotos y carpeta definida automáticamente
  const shouldUploadToDropbox = fotos.length > 0 && carpetaDropbox;
  
  if (shouldUploadToDropbox) {
    // Verificar si el token está configurado antes de intentar subir
    const hasToken = !!dropboxToken.value();
    
    if (!hasToken) {
      logger.warn("DROPBOX_ACCESS_TOKEN no configurado. Las fotos no se subirán a Dropbox.");
      // Obtener el nombre de la empresa/kit para usar en los nombres de archivo
      const empresaName = getEmpresaNameForFile(payload.tipoRegistro, payload.kit, payload.empresaTecnico);
      // Guardar las fotos con información de que no se subieron
      fotos.forEach((foto, index) => {
        const extension = foto.filename.split(".").pop() || "jpg";
        let fileName;
        if (fotos.length === 1) {
          fileName = `${fechaFormateada}_${empresaName}.${extension}`;
        } else {
          fileName = `${fechaFormateada}_${empresaName}_${index + 1}.${extension}`;
        }
        uploadedFiles.push({
          name: fileName,
          originalName: foto.filename,
          dropboxPath: null,
          dropboxId: null,
          uploaded: false,
          sharedLink: "",
          error: "DROPBOX_ACCESS_TOKEN no configurado",
        });
      });
    } else {
      try {
        logger.info("Iniciando subida de fotos a Dropbox", {
          fotosCount: fotos.length,
          carpeta: carpetaDropbox,
        });
      
      // Obtener el nombre de la empresa/kit para usar en los nombres de archivo
      const empresaName = getEmpresaNameForFile(payload.tipoRegistro, payload.kit, payload.empresaTecnico);
      
      // Crear promesas para subir todas las fotos en paralelo
      const uploadPromises = fotos.map((foto, index) => {
        // Obtener la extensión del archivo original o usar .jpg por defecto
        const extension = foto.filename.split(".").pop() || "jpg";
        
        // Crear nombre de archivo con la fecha y empresa
        // Si hay múltiples fotos, añadir un número secuencial
        let fileName;
        if (fotos.length === 1) {
          fileName = `${fechaFormateada}_${empresaName}.${extension}`;
        } else {
          fileName = `${fechaFormateada}_${empresaName}_${index + 1}.${extension}`;
        }
        
        return uploadToDropbox(foto.buffer, fileName, carpetaDropbox)
            .then((dropboxResult) => {
              logger.info(`Foto ${index + 1} subida correctamente a Dropbox`);
              const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
              const sharedLink = dropboxPath
                ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
                : "";
              return {
                name: fileName,
                originalName: foto.filename,
                dropboxPath,
                dropboxId: dropboxResult.id,
                uploaded: true,
                sharedLink,
              };
            })
            .catch((error) => {
              logger.error(`Error subiendo foto ${index + 1} a Dropbox`, {
                error: error.message,
                fileName,
              });
              // Continuar aunque falle la subida
              return {
                name: fileName,
                originalName: foto.filename,
                dropboxPath: null,
                dropboxId: null,
                uploaded: false,
                sharedLink: "",
                error: error.message,
              };
            });
      });
      
      // Esperar a que todas las fotos se procesen
      const results = await Promise.all(uploadPromises);
      uploadedFiles.push(...results);
      
      const successCount = results.filter((r) => r.uploaded).length;
      const failCount = results.filter((r) => !r.uploaded).length;
      
      logger.info("Subida de fotos completada", {
        total: fotos.length,
        success: successCount,
        failed: failCount,
      });
      
      if (failCount > 0) {
        logger.warn("Algunas fotos no se pudieron subir a Dropbox", {
          failed: failCount,
        });
      }
      } catch (error) {
        logger.error("Error crítico subiendo fotos a Dropbox", {
          error: error.message,
          stack: error.stack,
        });
        // Obtener el nombre de la empresa/kit para usar en los nombres de archivo
        const empresaName = getEmpresaNameForFile(payload.tipoRegistro, payload.kit, payload.empresaTecnico);
        // Continuar aunque falle completamente la subida
        // Las fotos se guardarán con información de error
        fotos.forEach((foto, index) => {
          const extension = foto.filename.split(".").pop() || "jpg";
          let fileName;
          if (fotos.length === 1) {
            fileName = `${fechaFormateada}_${empresaName}.${extension}`;
          } else {
            fileName = `${fechaFormateada}_${empresaName}_${index + 1}.${extension}`;
          }
          uploadedFiles.push({
            name: fileName,
            originalName: foto.filename,
            dropboxPath: null,
            dropboxId: null,
            uploaded: false,
            sharedLink: "",
            error: error.message,
          });
        });
      }
    }
  } else {
    let reason = "Desconocido";
    if (!fotos.length) {
      reason = "No hay fotos";
    } else if (!carpetaDropbox) {
      reason = "No se pudo determinar la carpeta de Dropbox";
    } else {
      reason = "Condición de subida no cumplida";
    }
    
    logger.warn("No se subirán fotos a Dropbox", {
      fotosCount: fotos.length,
      carpetaDropbox,
      kit: payload.kit,
      tipoRegistro: payload.tipoRegistro,
      reason,
    });
    // Obtener el nombre de la empresa/kit para usar en los nombres de archivo
    const empresaName = getEmpresaNameForFile(payload.tipoRegistro, payload.kit, payload.empresaTecnico);
    // Guardar las fotos sin subir a Dropbox
    fotos.forEach((foto, index) => {
      const extension = foto.filename.split(".").pop() || "jpg";
      let fileName;
      if (fotos.length === 1) {
        fileName = `${fechaFormateada}_${empresaName}.${extension}`;
      } else {
        fileName = `${fechaFormateada}_${empresaName}_${index + 1}.${extension}`;
      }
      uploadedFiles.push({
        name: fileName,
        originalName: foto.filename,
        dropboxPath: null,
        dropboxId: null,
        uploaded: false,
        error: !carpetaDropbox ? "Carpeta de Dropbox no seleccionada" : "No se pudo subir",
      });
    });
  }

  // Crear texto estructurado con todos los datos del formulario
  const firmaNombreLinea = payload.firmaNombreEmpleado
    ? `\nFirma (nombre empleado): ${payload.firmaNombreEmpleado}`
    : "";

  const reportText = `PG03.6 - REGISTRO HERRAMIENTAS
  
Fecha: ${payload.fecha}
Hora: ${payload.hora}
Tipo de Registro: ${payload.tipoRegistro === "MANTENIMIENTO_EXTERNO" ? "MANTENIMIENTO EXTERNO" : "HERRAMIENTAS ENVASADORAS (SEMANAL)"}
${payload.tipoRegistro === "MANTENIMIENTO_EXTERNO" ? `Empresa/Técnico: ${payload.empresaTecnico}` : `Kit seleccionado: ${payload.kit}`}
Carpeta Dropbox: ${carpetaDropbox || "N/A"}
Checklist Entrada Conforme: ${payload.checklistEntrada}
Checklist Salida Conforme: ${payload.checklistSalida}
Fotos subidas: ${uploadedFiles.length}
No Conformidad: ${payload.noConformidad}
${firma ? `Firma: Adjunta${firmaSubida && firmaSubida.uploaded ? ` (Subida a Dropbox: ${firmaSubida.dropboxPath})` : firmaSubida && firmaSubida.error ? ` (Error al subir: ${firmaSubida.error})` : ""}` : "Firma: No proporcionada"}${firmaNombreLinea}
  
Registrado por: ${employeeId}
Fecha de creación: ${new Date().toISOString()}`;

  const db = await getDb();
  const collection = db.collection(TOOLS_COLLECTION);
  const now = new Date();
  
  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoRegistro: payload.tipoRegistro,
    empresaTecnico: payload.empresaTecnico || null,
    kit: payload.kit || null,
    carpetaDropbox: carpetaDropbox || null,
    checklistEntrada: payload.checklistEntrada,
    checklistSalida: payload.checklistSalida,
    noConformidad: payload.noConformidad,
    tieneFirma: !!firma,
    firmaSubida: firmaSubida,
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    fotosSubidas: uploadedFiles,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Tool report created", {
    employeeId,
    reportId: result.insertedId,
    tipoRegistro: payload.tipoRegistro,
    fotosCount: uploadedFiles.length,
  });

  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Informe creado correctamente",
    fotosSubidas: uploadedFiles.length,
  });
}));

exports.createInitialReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  try {
    if (req.method !== "POST") {
      setCorsHeaders(req, res);
      res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
      return;
    }

    const payload = normalizeBody(req.body);
    const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
    
    if (!employeeId) {
      setCorsHeaders(req, res);
      res.status(400).json({error: "EMPLOYEE_REQUIRED"});
      return;
    }

    const requiredFields = [
      "fecha",
      "hora",
      "instalacionesLimpias",
      "manipuladoresUniformados",
      "peloProtegido",
      "unasLimpias",
      "elementosTamiz",
      "calibracionPHMetro",
    ];

    const missingFields = requiredFields.filter((field) => !payload[field]);
    
    if (missingFields.length > 0) {
      setCorsHeaders(req, res);
      res.status(400).json({
        error: "MISSING_FIELDS",
        message: `Campos requeridos faltantes: ${missingFields.join(", ")}`,
        missingFields,
      });
      return;
    }

    const db = await getDb();
    const collection = db.collection(INITIAL_REPORTS_COLLECTION);
    const now = new Date();

    let firmaInfo = null;
    if (payload.firmaImagenBase64) {
      try {
        const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
        const safeName = String(employeeId || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
        const fileName = `${fechaForName}_${safeName}.png`;
        const dropboxResult = await uploadFormularioSignatureFromDataUrl(
          payload.firmaImagenBase64,
          fileName,
          "INICIAL",
        );
        const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
        const sharedLink = dropboxPath
          ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
          : "";
        firmaInfo = {
          uploaded: true,
          name: fileName,
          dropboxPath,
          dropboxId: dropboxResult.id,
          sharedLink,
        };
      } catch (error) {
        logger.error("Error subiendo firma de informe inicial a Dropbox", {
          error: error.message,
        });
        firmaInfo = {
          uploaded: false,
          error: error.message,
        };
      }
    }

    const reportText = `INFORME INICIAL

Fecha: ${payload.fecha}
Hora: ${payload.hora}
Instalaciones limpias: ${payload.instalacionesLimpias}
Manipuladores correctamente uniformados: ${payload.manipuladoresUniformados}
Pelo correctamente protegido por gorro: ${payload.peloProtegido}
Uñas limpias y sin esmalte: ${payload.unasLimpias}
Elementos extraños en el tamiz del ojo: ${payload.elementosTamiz}
Calibración del PHMetro (PCC2): ${payload.calibracionPHMetro}

Registrado por: ${employeeId}
Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}
Fecha de creación: ${new Date().toISOString()}`;
    
    const doc = {
      employee_id: String(employeeId).trim(),
      fecha: payload.fecha,
      hora: payload.hora,
      tipoInforme: "INICIAL",
      instalacionesLimpias: payload.instalacionesLimpias,
      manipuladoresUniformados: payload.manipuladoresUniformados,
      peloProtegido: payload.peloProtegido,
      unasLimpias: payload.unasLimpias,
      elementosTamiz: payload.elementosTamiz,
      calibracionPHMetro: payload.calibracionPHMetro,
      firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
      firmaInfo,
      texto: reportText,
      datosCompletos: payload,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(doc);
    logger.info("Initial report created", {
      employeeId,
      reportId: result.insertedId,
    });

    setCorsHeaders(req, res);
    res.status(201).json({
      id: result.insertedId,
      success: true,
      message: "Informe Inicial creado correctamente",
    });
  } catch (error) {
    logger.error("Error in createInitialReport", {error: error.message, stack: error.stack});
    setCorsHeaders(req, res);
    if (!res.headersSent) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Error al crear el informe inicial: " + error.message,
      });
    }
  }
}));

// Crear informe de Envasado (tipoInforme: "ENVASADO")
exports.createPackagingReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  try {
    if (req.method !== "POST") {
      setCorsHeaders(req, res);
      res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
      return;
    }

    const payload = normalizeBody(req.body);
    const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

    if (!employeeId || !payload.fecha || !payload.hora) {
      setCorsHeaders(req, res);
      res.status(400).json({
        error: "MISSING_FIELDS",
        message: "employee_id, fecha y hora son obligatorios",
      });
      return;
    }

    const checklistKeys = [
      "paradasEmergencia",
      "integridadBoquillas",
      "fechaLoteImpresos",
      "fechaLoteLegibles",
      "envasesCierran",
      "etiquetaCorrecta",
      "unidadesCaja",
    ];

    for (const key of checklistKeys) {
      if (!payload[key]) {
        setCorsHeaders(req, res);
        res.status(400).json({
          error: "MISSING_CHECKLIST",
          message: `El campo de checklist "${key}" es obligatorio`,
        });
        return;
      }
    }

    const db = await getDb();
    const collection = db.collection(PACKAGING_REPORTS_COLLECTION);
    const now = new Date();

    let firmaInfo = null;
    if (payload.firmaImagenBase64) {
      try {
        const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
        const safeName = String(employeeId || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
        const fileName = `${fechaForName}_${safeName}.png`;
        const dropboxResult = await uploadFormularioSignatureFromDataUrl(
          payload.firmaImagenBase64,
          fileName,
          "ENVASADO",
        );
        const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
        const sharedLink = dropboxPath
          ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
          : "";
        firmaInfo = {
          uploaded: true,
          name: fileName,
          dropboxPath,
          dropboxId: dropboxResult.id,
          sharedLink,
        };
      } catch (error) {
        logger.error("Error subiendo firma de informe de envasado a Dropbox", {
          error: error.message,
        });
        firmaInfo = {
          uploaded: false,
          error: error.message,
        };
      }
    }

    const reportText = `INFORME DE ENVASADO
=====================

Empleado: ${employeeId}
Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

CHECKLIST:
- Funcionamiento de paradas de emergencia: ${payload.paradasEmergencia}
- Integridad de las boquillas correcta: ${payload.integridadBoquillas}
- Fecha y lote impreso correctos: ${payload.fechaLoteImpresos}
- Fecha y lote legibles y bien ubicados: ${payload.fechaLoteLegibles}
- Los envases cierran correctamente: ${payload.envasesCierran}
- Etiqueta correcta: ${payload.etiquetaCorrecta}
- La caja tiene las unidades correspondientes: ${payload.unidadesCaja}

Tipo de Informe: ENVASADO
Registrado por: ${employeeId}
Fecha de creación: ${new Date().toISOString()}`;

    const doc = {
      employee_id: String(employeeId).trim(),
      fecha: payload.fecha,
      hora: payload.hora,
      tipoInforme: "ENVASADO",
      checklist: {
        paradasEmergencia: payload.paradasEmergencia,
        integridadBoquillas: payload.integridadBoquillas,
        fechaLoteImpresos: payload.fechaLoteImpresos,
        fechaLoteLegibles: payload.fechaLoteLegibles,
        envasesCierran: payload.envasesCierran,
        etiquetaCorrecta: payload.etiquetaCorrecta,
        unidadesCaja: payload.unidadesCaja,
      },
      firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
      firmaInfo,
      texto: reportText,
      datosCompletos: payload,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(doc);
    logger.info("Packaging report created", {
      employeeId,
      reportId: result.insertedId,
      tipoInforme: "ENVASADO",
    });

    setCorsHeaders(req, res);
    res.status(201).json({
      id: result.insertedId,
      success: true,
      message: "Informe de Envasado creado correctamente",
    });
  } catch (error) {
    logger.error("Error in createPackagingReport", {error: error.message, stack: error.stack});
    setCorsHeaders(req, res);
    if (!res.headersSent) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Error al crear el informe de envasado: " + error.message,
      });
    }
  }
}));

// Crear informe de Producción (tipoInforme: "PRODUCCION")
exports.createProductionReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  const requiredFields = [
    "employee_id",
    "fecha",
    "hora",
    "tipoProducto",
    "color",
    "olor",
    "sabor",
    "textura",
    "phPcc2",
    "numeroCampana",
  ];

  const missing = requiredFields.filter((field) => !payload[field] && payload[field] !== 0);
  if (missing.length > 0) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: `Faltan campos obligatorios: ${missing.join(", ")}`,
    });
    return;
  }

  const phValue = Number(payload.phPcc2);
  if (Number.isNaN(phValue)) {
    res.status(400).json({
      error: "INVALID_PH",
      message: "El valor de pH (PCC2) debe ser numérico",
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(PRODUCTION_REPORTS_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(employeeId || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "PRODUCCION",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de informe de producción a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoInforme: "PRODUCCION",
    tipoProducto: payload.tipoProducto,
    numeroCampana: Number(payload.numeroCampana),
    color: payload.color,
    olor: payload.olor,
    sabor: payload.sabor,
    textura: payload.textura,
    phPcc2: phValue,
    texto: `INFORME DE PRODUCCIÓN
========================

Empleado: ${employeeId}
Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

PRODUCTO: ${payload.tipoProducto}
COLOR: ${payload.color}
OLOR: ${payload.olor}
SABOR: ${payload.sabor}
TEXTURA: ${payload.textura}

Número de campaña: ${payload.numeroCampana}

pH (PCC2): ${phValue}

Checklist componentes:
- Aceite: ${payload.checklistComponentes?.aceite || "N/A"}
- Huevo: ${payload.checklistComponentes?.huevo || "N/A"}
- Yema: ${payload.checklistComponentes?.yema || "N/A"}
- Ajo: ${payload.checklistComponentes?.ajo || "N/A"}
- Sal: ${payload.checklistComponentes?.sal || "N/A"}
- Limón: ${payload.checklistComponentes?.limon || "N/A"}
- Sorbato: ${payload.checklistComponentes?.sorbato || "N/A"}
- Xantana: ${payload.checklistComponentes?.xantana || "N/A"}
- Colorante: ${payload.checklistComponentes?.colorante || "N/A"}
- Benzoato: ${payload.checklistComponentes?.benzoato || "N/A"}

Fecha de creación: ${now.toISOString()}`,
    datosCompletos: payload,
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    firmaInfo,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Production report created", {
    employeeId,
    reportId: result.insertedId,
    tipoInforme: "PRODUCCION",
  });

  setCorsHeaders(req, res);
  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Informe de Producción creado correctamente",
  });
}));

const normalizePesosParciales = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (item === "" || item === null || item === undefined) return null;
    const num = Number(item);
    return Number.isNaN(num) ? null : num;
  });
};

// Guardar borrador de Peso producto
exports.saveWeightDraft = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  if (!employeeId || !payload.fecha || !payload.hora || !payload.envaseCantidad) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id, fecha, hora y envaseCantidad son obligatorios",
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(WEIGHT_REPORTS_COLLECTION);
  const now = new Date();

  const pesosParciales = normalizePesosParciales(payload.pesos);

  const entry = {
    fechaEntrada: payload.fecha,
    horaEntrada: payload.hora,
    pesosRegistrados: pesosParciales,
    createdAt: now,
  };

  let existing = null;
  if (payload.draftId) {
    try {
      existing = await collection.findOne({_id: new ObjectId(payload.draftId)});
    } catch (error) {
      res.status(400).json({error: "INVALID_ID", message: "draftId inválido"});
      return;
    }
  }

  if (!existing) {
    existing = await collection.findOne(
      {employee_id: String(employeeId).trim(), completo: false},
      {sort: {updatedAt: -1}},
    );
  }

  if (existing) {
    await collection.updateOne(
      {_id: existing._id},
      {
        $set: {
          fecha: payload.fecha,
          hora: payload.hora,
          tipoInforme: "PESO_PRODUCTO",
          envaseCantidad: payload.envaseCantidad || null,
          pesos: pesosParciales,
          datosCompletos: payload,
          completo: false,
          updatedAt: now,
        },
        $push: {entradas: entry},
      },
    );
    res.json({
      id: existing._id,
      success: true,
      message: "Borrador de Peso producto guardado correctamente",
    });
    return;
  }

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoInforme: "PESO_PRODUCTO",
    envaseCantidad: payload.envaseCantidad || null,
    pesos: pesosParciales,
    entradas: [entry],
    completo: false,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Borrador de Peso producto guardado correctamente",
  });
}));

// Obtener borrador pendiente de Peso producto
exports.getPendingWeightReport = onRequest(withCors(async (req, res) => {
  const employeeId = req.query.employeeId || req.query.employee_id || req.query.usuario;
  if (!employeeId) {
    res.status(400).json({error: "MISSING_FIELDS", message: "employeeId es obligatorio"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(WEIGHT_REPORTS_COLLECTION);
  const pending = await collection.findOne(
    {employee_id: String(employeeId).trim(), completo: false},
    {sort: {updatedAt: -1}},
  );

  if (!pending) {
    res.json({pending: false});
    return;
  }

  res.json({
    pending: true,
    report: {
      id: pending._id,
      employee_id: pending.employee_id,
      fecha: pending.fecha,
      hora: pending.hora,
      envaseCantidad: pending.envaseCantidad || null,
      pesos: pending.pesos || [],
      entradas: pending.entradas || [],
      completo: pending.completo === true,
      createdAt: pending.createdAt,
      updatedAt: pending.updatedAt,
    },
  });
}));

// Crear informe de Peso producto (80 campos numéricos)
exports.createWeightReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  if (!employeeId || !payload.fecha || !payload.hora) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id, fecha y hora son obligatorios",
    });
    return;
  }

  if (!Array.isArray(payload.pesos) || payload.pesos.length === 0) {
    res.status(400).json({
      error: "INVALID_PESOS",
      message: "Se requieren 80 valores numéricos de peso en el campo 'pesos'",
    });
    return;
  }

  const numericPesos = payload.pesos.map((v) => Number(v));
  const hasInvalid = numericPesos.some((v) => Number.isNaN(v));
  if (hasInvalid) {
    res.status(400).json({
      error: "INVALID_PESOS",
      message: "Todos los valores de 'pesos' deben ser numéricos",
    });
    return;
  }

  const count = numericPesos.length;
  const sum = numericPesos.reduce((acc, v) => acc + v, 0);
  const min = Math.min(...numericPesos);
  const max = Math.max(...numericPesos);
  const avg = count > 0 ? sum / count : 0;

  const db = await getDb();
  const collection = db.collection(WEIGHT_REPORTS_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(employeeId || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "PESO PRODUCTO",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de informe de peso producto a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const entry = {
    fechaEntrada: payload.fecha,
    horaEntrada: payload.hora,
    pesosRegistrados: numericPesos,
    createdAt: now,
  };

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoInforme: "PESO_PRODUCTO",
    envaseCantidad: payload.envaseCantidad,
    pesos: numericPesos,
    min,
    max,
    promedio: avg,
    resumenPesos: {
      cantidad: count,
      minimo: min,
      maximo: max,
      promedio: avg,
    },
    texto: `INFORME DE PESO PRODUCTO
===========================

Empleado: ${employeeId}
Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

Nº de mediciones: ${count}
Peso mínimo: ${min}
Peso máximo: ${max}
Peso medio: ${avg}

Valores detallados:
${numericPesos.map((v, i) => `#${i + 1}: ${v}`).join("\\n")}

Fecha de creación: ${now.toISOString()}`,
    datosCompletos: payload,
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    firmaInfo,
    entradas: [entry],
    completo: true,
    createdAt: now,
    updatedAt: now,
  };

  let existing = null;
  if (payload.draftId) {
    try {
      existing = await collection.findOne({_id: new ObjectId(payload.draftId)});
    } catch (error) {
      res.status(400).json({error: "INVALID_ID", message: "draftId inválido"});
      return;
    }
  }

  if (!existing) {
    existing = await collection.findOne(
      {employee_id: String(employeeId).trim(), completo: false},
      {sort: {updatedAt: -1}},
    );
  }

  if (existing) {
    await collection.updateOne(
      {_id: existing._id},
      {
        $set: {
          fecha: payload.fecha,
          hora: payload.hora,
          tipoInforme: "PESO_PRODUCTO",
          envaseCantidad: payload.envaseCantidad,
          pesos: numericPesos,
          min,
          max,
          promedio: avg,
          resumenPesos: doc.resumenPesos,
          texto: doc.texto,
          datosCompletos: payload,
          firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
          firmaInfo,
          completo: true,
          updatedAt: now,
        },
        $push: {entradas: entry},
      },
    );
    logger.info("Weight report completed", {
      employeeId,
      reportId: existing._id,
      tipoInforme: "PESO_PRODUCTO",
    });
    res.status(201).json({
      id: existing._id,
      success: true,
      message: "Informe de Peso producto creado correctamente",
    });
    return;
  }

  const result = await collection.insertOne(doc);
  logger.info("Weight report created", {
    employeeId,
    reportId: result.insertedId,
    tipoInforme: "PESO_PRODUCTO",
  });

  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Informe de Peso producto creado correctamente",
  });
}));

// Crear informe de Limpieza
exports.createCleaningReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    setCorsHeaders(req, res);
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  if (!employeeId || !payload.fecha || !payload.hora) {
    setCorsHeaders(req, res);
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id, fecha y hora son obligatorios",
    });
    return;
  }

  // Validar campos numéricos
  const numericFields = {
    desengrasantePorLitro: payload.desengrasantePorLitro,
    desinfectantePorLitro: payload.desinfectantePorLitro,
    phAclarado: payload.phAclarado,
    phGrifo: payload.phGrifo,
  };

  for (const [key, value] of Object.entries(numericFields)) {
    if (value !== undefined && value !== null && value !== "") {
      const numValue = Number(value);
      if (Number.isNaN(numValue)) {
        setCorsHeaders(req, res);
        res.status(400).json({
          error: "INVALID_NUMERIC",
          message: `El campo ${key} debe ser un número válido`,
        });
        return;
      }
    }
  }

  const db = await getDb();
  const collection = db.collection(CLEANING_REPORTS_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(employeeId || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        "LIMPIEZA",
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de informe de limpieza a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  const reportText = `INFORME DE LIMPIEZA
=====================

Empleado: ${employeeId}
Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

Control de superficies: ${payload.controlSuperficies ? "Correcto" : "Incorrecto"}
Desengrasante por litro de agua: ${payload.desengrasantePorLitro || "N/A"}
Desinfectante por litro de agua: ${payload.desinfectantePorLitro || "N/A"}
PH del agua del aclarado: ${payload.phAclarado || "N/A"}
PH del grifo: ${payload.phGrifo || "N/A"}

Tipo de Informe: LIMPIEZA
Registrado por: ${employeeId}
Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoInforme: "LIMPIEZA",
    controlSuperficies: payload.controlSuperficies === true || payload.controlSuperficies === "true" || payload.controlSuperficies === "SI",
    desengrasantePorLitro: payload.desengrasantePorLitro ? Number(payload.desengrasantePorLitro) : null,
    desinfectantePorLitro: payload.desinfectantePorLitro ? Number(payload.desinfectantePorLitro) : null,
    phAclarado: payload.phAclarado ? Number(payload.phAclarado) : null,
    phGrifo: payload.phGrifo ? Number(payload.phGrifo) : null,
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Cleaning report created", {
    employeeId,
    reportId: result.insertedId,
    tipoInforme: "LIMPIEZA",
  });

  setCorsHeaders(req, res);
  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Informe de Limpieza creado correctamente",
  });
}));

exports.listToolReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  // Permitir consultar más registros (por defecto 200, máximo 1000)
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(TOOLS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => {
      const firmaSubida = report.firmaSubida
        ? await ensureSharedLink(collection, report._id, report.firmaSubida, "firmaSubida")
        : report.firmaSubida;
      const fotosSubidas = (report.fotosSubidas || []).map((foto) => {
        if (foto.sharedLink || !foto.dropboxPath) return foto;
        return {
          ...foto,
          sharedLink: `https://www.dropbox.com/home${encodeURI(foto.dropboxPath)}`,
        };
      });
      return {
        id: report._id,
        employee_id: report.employee_id,
        fecha: report.fecha,
        hora: report.hora,
        tipoRegistro: report.tipoRegistro,
        empresaTecnico: report.empresaTecnico,
        kit: report.kit,
        checklistEntrada: report.checklistEntrada,
        checklistSalida: report.checklistSalida,
        carpetaDropbox: report.carpetaDropbox,
        carpetaDropboxSeleccionada: report.carpetaDropboxSeleccionada,
        noConformidad: report.noConformidad,
        fotosSubidas: fotosSubidas || [],
        tieneFirma: report.tieneFirma,
        firmaSubida: firmaSubida || null,
        texto: report.texto,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      };
    }),
  );
  res.json(enriched);
}));

// Listar informes iniciales
exports.listInitialReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(INITIAL_REPORTS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoInforme: report.tipoInforme,
      instalacionesLimpias: report.instalacionesLimpias,
      manipuladoresUniformados: report.manipuladoresUniformados,
      peloProtegido: report.peloProtegido,
      unasLimpias: report.unasLimpias,
      elementosTamiz: report.elementosTamiz,
      calibracionPHMetro: report.calibracionPHMetro,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      datosCompletos: report.datosCompletos,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

// Listar informes de envasado
exports.listPackagingReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(PACKAGING_REPORTS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoInforme: report.tipoInforme,
      checklist: report.checklist,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      datosCompletos: report.datosCompletos,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

// Listar informes de producción
exports.listProductionReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(PRODUCTION_REPORTS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoInforme: report.tipoInforme,
      tipoProducto: report.tipoProducto,
      color: report.color,
      olor: report.olor,
      sabor: report.sabor,
      textura: report.textura,
      phPcc2: report.phPcc2,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      datosCompletos: report.datosCompletos,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

// Listar informes de peso producto
exports.listWeightReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(WEIGHT_REPORTS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoInforme: report.tipoInforme,
      pesos: report.pesos,
      envaseCantidad: report.envaseCantidad,
      min: report.min,
      max: report.max,
      promedio: report.promedio,
      resumenPesos: report.resumenPesos,
      entradas: report.entradas,
      completo: report.completo === true,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      datosCompletos: report.datosCompletos,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

// Listar informes de limpieza
exports.listCleaningReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(CLEANING_REPORTS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoInforme: report.tipoInforme,
      controlSuperficies: report.controlSuperficies,
      desengrasantePorLitro: report.desengrasantePorLitro,
      desinfectantePorLitro: report.desinfectantePorLitro,
      phAclarado: report.phAclarado,
      phGrifo: report.phGrifo,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      datosCompletos: report.datosCompletos,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

// Actualizar un registro de tiempo
exports.updateEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del registro"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);
  
  // Verificar que el registro existe
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Registro no encontrado"});
    return;
  }

  // Preparar los campos a actualizar
  const updateFields = {
    updatedAt: new Date(),
  };

  if (payload.employee_id !== undefined) updateFields.employee_id = String(payload.employee_id).trim();
  if (payload.date !== undefined) updateFields.date = payload.date;
  if (payload.check_in !== undefined) {
    updateFields.check_in = payload.check_in ? new Date(payload.check_in) : null;
  }
  if (payload.check_out !== undefined) {
    updateFields.check_out = payload.check_out ? new Date(payload.check_out) : null;
  }
  if (payload.notes !== undefined) updateFields.notes = payload.notes || "";
  
  // Recalcular horas trabajadas si se actualizaron check_in o check_out
  if (updateFields.check_in || updateFields.check_out || payload.check_in !== undefined || payload.check_out !== undefined) {
    const checkIn = updateFields.check_in || existing.check_in;
    const checkOut = updateFields.check_out !== undefined ? updateFields.check_out : existing.check_out;
    
    if (checkIn && checkOut) {
      const hours = (checkOut - checkIn) / (1000 * 60 * 60);
      updateFields.worked_hours = Math.round(hours * 100) / 100;
      updateFields.status = "completo";
    } else if (checkIn && !checkOut) {
      updateFields.status = "incompleto";
      updateFields.worked_hours = null;
    }
  }

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Registro no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Entry updated", {entryId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    date: updated.date,
    check_in: updated.check_in,
    check_out: updated.check_out,
    worked_hours: updated.worked_hours,
    status: updated.status,
    notes: updated.notes,
    updatedAt: updated.updatedAt,
  });
}));

// Eliminar un registro de tiempo
exports.deleteEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del registro"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);
  
  // Verificar que el registro existe
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Registro no encontrado"});
    return;
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});

  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Registro no encontrado"});
    return;
  }

  logger.info("Entry deleted", {entryId: id});

  res.json({
    success: true,
    message: "Registro eliminado correctamente",
    id,
  });
}));

// Actualizar un registro de herramientas
exports.updateToolReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(TOOLS_COLLECTION);
  
  // Verificar que el informe existe
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  // Preparar los campos a actualizar
  const updateFields = {
    updatedAt: new Date(),
  };

  // Determinar la carpeta automáticamente según el tipo de registro y kit
  let carpetaDropbox = null;
  const tipoRegistroFinal = updateFields.tipoRegistro !== undefined ? updateFields.tipoRegistro : existing.tipoRegistro;
  const kitFinal = updateFields.kit !== undefined ? updateFields.kit : existing.kit;
  
  if (tipoRegistroFinal === "MANTENIMIENTO_EXTERNO") {
    carpetaDropbox = "MANTENIMIENTO EXTERNO";
  } else if (tipoRegistroFinal === "HERRAMIENTAS_ENVASADORAS" && kitFinal) {
    const kitFolderMap = {
      "KIT_1_ENVASADORA_3.6_KG": "ENVASADORA 3600",
      "KIT_2_ENVASADORA_2_KG": "ENVASADORA 2000 ML",
      "KIT_3_ENVASADORA_TARRINAS": "ENVASADORA TARRINAS",
      "KIT_4_CAJA_COMUN": "CAJA COMUN",
    };
    carpetaDropbox = kitFolderMap[kitFinal] || null;
  } else {
    carpetaDropbox = existing.carpetaDropbox || null;
  }

  // Campos editables
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.tipoRegistro !== undefined) updateFields.tipoRegistro = payload.tipoRegistro;
  if (payload.empresaTecnico !== undefined) updateFields.empresaTecnico = payload.empresaTecnico || null;
  if (payload.kit !== undefined) updateFields.kit = payload.kit || null;
  if (payload.checklistEntrada !== undefined) updateFields.checklistEntrada = payload.checklistEntrada;
  if (payload.checklistSalida !== undefined) updateFields.checklistSalida = payload.checklistSalida;
  updateFields.carpetaDropbox = carpetaDropbox;
  if (payload.noConformidad !== undefined) updateFields.noConformidad = payload.noConformidad;

  // Actualizar el texto del informe si se modificaron campos
  const reportText = `PG03.6 - REGISTRO HERRAMIENTAS

Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}
Tipo de Registro: ${tipoRegistroFinal === "MANTENIMIENTO_EXTERNO" ? "MANTENIMIENTO EXTERNO" : "HERRAMIENTAS ENVASADORAS (SEMANAL)"}
${tipoRegistroFinal === "MANTENIMIENTO_EXTERNO" 
  ? `Empresa/Técnico: ${updateFields.empresaTecnico !== undefined ? updateFields.empresaTecnico : existing.empresaTecnico || "N/A"}` 
  : `Kit seleccionado: ${kitFinal || "N/A"}`}
Carpeta Dropbox: ${carpetaDropbox || "N/A"}
Checklist Entrada Conforme: ${updateFields.checklistEntrada || existing.checklistEntrada}
Checklist Salida Conforme: ${updateFields.checklistSalida || existing.checklistSalida}
Fotos subidas: ${existing.fotosSubidas ? existing.fotosSubidas.length : 0}
No Conformidad: ${updateFields.noConformidad || existing.noConformidad}
${existing.tieneFirma ? `Firma: Adjunta${existing.firmaSubida && existing.firmaSubida.uploaded ? ` (Subida a Dropbox: ${existing.firmaSubida.dropboxPath})` : existing.firmaSubida && existing.firmaSubida.error ? ` (Error al subir: ${existing.firmaSubida.error})` : ""}` : "Firma: No proporcionada"}

Registrado por: ${existing.employee_id}
Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Tool report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    tipoRegistro: updated.tipoRegistro,
    empresaTecnico: updated.empresaTecnico,
    kit: updated.kit,
    checklistEntrada: updated.checklistEntrada,
    checklistSalida: updated.checklistSalida,
    carpetaDropbox: updated.carpetaDropbox,
    carpetaDropboxSeleccionada: updated.carpetaDropboxSeleccionada,
    noConformidad: updated.noConformidad,
    fotosSubidas: updated.fotosSubidas || [],
    tieneFirma: updated.tieneFirma,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Eliminar un registro de herramientas
exports.deleteToolReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(TOOLS_COLLECTION);
  
  // Verificar que el informe existe
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  // Intentar borrar fotos y firma en Dropbox antes de eliminar el informe
  try {
    const deleteTasks = [];
    if (Array.isArray(existing.fotosSubidas)) {
      existing.fotosSubidas.forEach((foto, index) => {
        if (foto && foto.dropboxPath) {
          deleteTasks.push(
            deleteDropboxFileIfExists(foto.dropboxPath, {reportId: id, type: "foto", index})
          );
        }
      });
    }
    if (existing.firmaSubida && existing.firmaSubida.dropboxPath) {
      deleteTasks.push(
        deleteDropboxFileIfExists(existing.firmaSubida.dropboxPath, {reportId: id, type: "firma"})
      );
    }
    if (deleteTasks.length > 0) {
      await Promise.all(deleteTasks);
    }
  } catch (error) {
    logger.error("Error al intentar eliminar archivos de Dropbox del informe de herramientas", {
      reportId: id,
      error: error.message,
      stack: error.stack,
    });
    // Continuar con la eliminación del informe aunque haya error en Dropbox
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});

  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Tool report deleted", {reportId: id});

  res.json({
    success: true,
    message: "Informe eliminado correctamente",
    id,
  });
}));

// Actualizar informe inicial
exports.updateInitialReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(INITIAL_REPORTS_COLLECTION);
  
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.instalacionesLimpias !== undefined) updateFields.instalacionesLimpias = payload.instalacionesLimpias;
  if (payload.manipuladoresUniformados !== undefined) updateFields.manipuladoresUniformados = payload.manipuladoresUniformados;
  if (payload.peloProtegido !== undefined) updateFields.peloProtegido = payload.peloProtegido;
  if (payload.unasLimpias !== undefined) updateFields.unasLimpias = payload.unasLimpias;
  if (payload.elementosTamiz !== undefined) updateFields.elementosTamiz = payload.elementosTamiz;
  if (payload.calibracionPHMetro !== undefined) updateFields.calibracionPHMetro = payload.calibracionPHMetro;

  const reportText = `INFORME INICIAL

Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}
Instalaciones limpias: ${updateFields.instalacionesLimpias || existing.instalacionesLimpias}
Manipuladores correctamente uniformados: ${updateFields.manipuladoresUniformados || existing.manipuladoresUniformados}
Pelo correctamente protegido por gorro: ${updateFields.peloProtegido || existing.peloProtegido}
Uñas limpias y sin esmalte: ${updateFields.unasLimpias || existing.unasLimpias}
Elementos extraños en el tamiz del ojo: ${updateFields.elementosTamiz || existing.elementosTamiz}
Calibración del PHMetro (PCC2): ${updateFields.calibracionPHMetro || existing.calibracionPHMetro}

Registrado por: ${existing.employee_id}
Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Initial report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    tipoInforme: updated.tipoInforme,
    instalacionesLimpias: updated.instalacionesLimpias,
    manipuladoresUniformados: updated.manipuladoresUniformados,
    peloProtegido: updated.peloProtegido,
    unasLimpias: updated.unasLimpias,
    elementosTamiz: updated.elementosTamiz,
    calibracionPHMetro: updated.calibracionPHMetro,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Eliminar informe inicial
exports.deleteInitialReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(INITIAL_REPORTS_COLLECTION);
  
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_inicial"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});

  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Initial report deleted", {reportId: id});

  res.json({
    success: true,
    message: "Informe eliminado correctamente",
    id,
  });
}));

// Actualizar informe de envasado
exports.updatePackagingReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(PACKAGING_REPORTS_COLLECTION);
  
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  
  const checklist = existing.checklist || {};
  if (payload.paradasEmergencia !== undefined) checklist.paradasEmergencia = payload.paradasEmergencia;
  if (payload.integridadBoquillas !== undefined) checklist.integridadBoquillas = payload.integridadBoquillas;
  if (payload.fechaLoteImpresos !== undefined) checklist.fechaLoteImpresos = payload.fechaLoteImpresos;
  if (payload.fechaLoteLegibles !== undefined) checklist.fechaLoteLegibles = payload.fechaLoteLegibles;
  if (payload.envasesCierran !== undefined) checklist.envasesCierran = payload.envasesCierran;
  if (payload.etiquetaCorrecta !== undefined) checklist.etiquetaCorrecta = payload.etiquetaCorrecta;
  if (payload.unidadesCaja !== undefined) checklist.unidadesCaja = payload.unidadesCaja;
  updateFields.checklist = checklist;

  const reportText = `INFORME DE ENVASADO
=====================

Empleado: ${existing.employee_id}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

CHECKLIST:
- Funcionamiento de paradas de emergencia: ${checklist.paradasEmergencia || existing.checklist?.paradasEmergencia}
- Integridad de las boquillas correcta: ${checklist.integridadBoquillas || existing.checklist?.integridadBoquillas}
- Fecha y lote impreso correctos: ${checklist.fechaLoteImpresos || existing.checklist?.fechaLoteImpresos}
- Fecha y lote legibles y bien ubicados: ${checklist.fechaLoteLegibles || existing.checklist?.fechaLoteLegibles}
- Los envases cierran correctamente: ${checklist.envasesCierran || existing.checklist?.envasesCierran}
- Etiqueta correcta: ${checklist.etiquetaCorrecta || existing.checklist?.etiquetaCorrecta}
- La caja tiene las unidades correspondientes: ${checklist.unidadesCaja || existing.checklist?.unidadesCaja}

Tipo de Informe: ENVASADO
Registrado por: ${existing.employee_id}
Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Packaging report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    tipoInforme: updated.tipoInforme,
    checklist: updated.checklist,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Eliminar informe de envasado
exports.deletePackagingReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(PACKAGING_REPORTS_COLLECTION);
  
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_envasado"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});

  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Packaging report deleted", {reportId: id});

  res.json({
    success: true,
    message: "Informe eliminado correctamente",
    id,
  });
}));

// Actualizar informe de producción
exports.updateProductionReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(PRODUCTION_REPORTS_COLLECTION);
  
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.color !== undefined) updateFields.color = payload.color;
  if (payload.olor !== undefined) updateFields.olor = payload.olor;
  if (payload.sabor !== undefined) updateFields.sabor = payload.sabor;
  if (payload.textura !== undefined) updateFields.textura = payload.textura;
  if (payload.phPcc2 !== undefined) updateFields.phPcc2 = payload.phPcc2;

  const reportText = `INFORME DE PRODUCCIÓN
=====================

Empleado: ${existing.employee_id}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

Color: ${updateFields.color || existing.color}
Olor: ${updateFields.olor || existing.olor}
Sabor: ${updateFields.sabor || existing.sabor}
Textura: ${updateFields.textura || existing.textura}
PH PCC2: ${updateFields.phPcc2 !== undefined ? updateFields.phPcc2 : existing.phPcc2}

Tipo de Informe: PRODUCCION
Registrado por: ${existing.employee_id}
Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Production report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    tipoInforme: updated.tipoInforme,
    color: updated.color,
    olor: updated.olor,
    sabor: updated.sabor,
    textura: updated.textura,
    phPcc2: updated.phPcc2,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Eliminar informe de producción
exports.deleteProductionReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(PRODUCTION_REPORTS_COLLECTION);
  
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_produccion"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});

  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Production report deleted", {reportId: id});

  res.json({
    success: true,
    message: "Informe eliminado correctamente",
    id,
  });
}));

// Actualizar informe de peso producto
exports.updateWeightReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(WEIGHT_REPORTS_COLLECTION);
  
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  
  if (payload.pesos !== undefined) {
    updateFields.pesos = payload.pesos;
    const pesosArray = Array.isArray(payload.pesos) ? payload.pesos : Object.values(payload.pesos);
    const pesosNumericos = pesosArray.filter(p => p !== null && p !== undefined && p !== "").map(p => parseFloat(p)).filter(p => !isNaN(p));
    if (pesosNumericos.length > 0) {
      updateFields.min = Math.min(...pesosNumericos);
      updateFields.max = Math.max(...pesosNumericos);
      updateFields.promedio = pesosNumericos.reduce((a, b) => a + b, 0) / pesosNumericos.length;
    }
  }
  if (payload.envaseCantidad !== undefined) {
    updateFields.envaseCantidad = payload.envaseCantidad;
  }

  const reportText = `INFORME DE PESO PRODUCTO
=====================

Empleado: ${existing.employee_id}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

Pesos registrados: ${updateFields.pesos ? Object.keys(updateFields.pesos).length : existing.pesos ? Object.keys(existing.pesos).length : 0}
Mínimo: ${updateFields.min !== undefined ? updateFields.min : existing.min || "N/A"}
Máximo: ${updateFields.max !== undefined ? updateFields.max : existing.max || "N/A"}
Promedio: ${updateFields.promedio !== undefined ? updateFields.promedio.toFixed(2) : existing.promedio ? existing.promedio.toFixed(2) : "N/A"}

Tipo de Informe: PESO_PRODUCTO
Registrado por: ${existing.employee_id}
Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Weight report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    tipoInforme: updated.tipoInforme,
    envaseCantidad: updated.envaseCantidad,
    pesos: updated.pesos,
    min: updated.min,
    max: updated.max,
    promedio: updated.promedio,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Eliminar informe de peso producto
exports.deleteWeightReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(WEIGHT_REPORTS_COLLECTION);
  
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_peso_producto"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});

  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Weight report deleted", {reportId: id});

  res.json({
    success: true,
    message: "Informe eliminado correctamente",
    id,
  });
}));

// Actualizar informe de limpieza
exports.updateCleaningReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CLEANING_REPORTS_COLLECTION);
  
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.controlSuperficies !== undefined) updateFields.controlSuperficies = payload.controlSuperficies;
  if (payload.desengrasantePorLitro !== undefined) updateFields.desengrasantePorLitro = payload.desengrasantePorLitro;
  if (payload.desinfectantePorLitro !== undefined) updateFields.desinfectantePorLitro = payload.desinfectantePorLitro;
  if (payload.phAclarado !== undefined) updateFields.phAclarado = payload.phAclarado;
  if (payload.phGrifo !== undefined) updateFields.phGrifo = payload.phGrifo;

  const reportText = `INFORME DE LIMPIEZA
=====================

Empleado: ${existing.employee_id}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

Control de superficies: ${updateFields.controlSuperficies !== undefined ? (updateFields.controlSuperficies ? "Correcto" : "Incorrecto") : (existing.controlSuperficies ? "Correcto" : "Incorrecto")}
Desengrasante por litro de agua: ${updateFields.desengrasantePorLitro !== undefined ? updateFields.desengrasantePorLitro : existing.desengrasantePorLitro || "N/A"}
Desinfectante por litro de agua: ${updateFields.desinfectantePorLitro !== undefined ? updateFields.desinfectantePorLitro : existing.desinfectantePorLitro || "N/A"}
PH del agua del aclarado: ${updateFields.phAclarado !== undefined ? updateFields.phAclarado : existing.phAclarado || "N/A"}
PH del grifo: ${updateFields.phGrifo !== undefined ? updateFields.phGrifo : existing.phGrifo || "N/A"}

Tipo de Informe: LIMPIEZA
Registrado por: ${existing.employee_id}
Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Cleaning report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    tipoInforme: updated.tipoInforme,
    controlSuperficies: updated.controlSuperficies,
    desengrasantePorLitro: updated.desengrasantePorLitro,
    desinfectantePorLitro: updated.desinfectantePorLitro,
    phAclarado: updated.phAclarado,
    phGrifo: updated.phGrifo,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Eliminar informe de limpieza
exports.deleteCleaningReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CLEANING_REPORTS_COLLECTION);
  
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_limpieza"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});

  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Cleaning report deleted", {reportId: id});

  res.json({
    success: true,
    message: "Informe eliminado correctamente",
    id,
  });
}));

// Crear informe de Limpieza Planta
exports.createCleaningPlantReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    setCorsHeaders(req, res);
    res.status(405).json({error: "METHOD_NOT_ALLOWED", message: "Método no permitido"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  if (!employeeId || !payload.fecha || !payload.hora || !payload.zona) {
    setCorsHeaders(req, res);
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "employee_id, fecha, hora y zona son obligatorios",
    });
    return;
  }

  const periodo = ["SEMANAL", "MENSUAL", "TRIMESTRAL", "ANUAL"].includes(payload.periodo)
    ? payload.periodo
    : "SEMANAL";

  const db = await getDb();
  const collection = db.collection(CLEANING_PLANT_REPORTS_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(employeeId || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const zonaNombre = (payload.zonaNombre || payload.zona || "GENERAL").replace(/[/\\]/g, "-").trim();
      const formularioFolder = `LIMPIEZA PLANTA/${zonaNombre}/${periodo}`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(
        payload.firmaImagenBase64,
        fileName,
        formularioFolder,
      );
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      const sharedLink = dropboxPath
        ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}`
        : "";
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath,
        dropboxId: dropboxResult.id,
        sharedLink,
      };
    } catch (error) {
      logger.error("Error subiendo firma de informe de limpieza planta a Dropbox", {
        error: error.message,
      });
      firmaInfo = {
        uploaded: false,
        error: error.message,
      };
    }
  }

  // Subir firma del responsable (si existe) a subcarpeta FIRMAS RESPONSABLE
  let firmaResponsableInfo = null;
  if (payload.firmaImagenBase64Responsable) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeNameResp = String(payload.firmaNombreResponsable || "RESPONSABLE").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileNameResp = `${fechaForName}_${safeNameResp}.png`;
      const zonaNombre = (payload.zonaNombre || payload.zona || "GENERAL").replace(/[/\\]/g, "-").trim();
      const formularioFolderResp = `LIMPIEZA PLANTA/${zonaNombre}/${periodo}`;
      const dropboxResultResp = await uploadFormularioSignatureResponsableFromDataUrl(
        payload.firmaImagenBase64Responsable,
        fileNameResp,
        formularioFolderResp,
      );
      const dropboxPathResp = dropboxResultResp.path_display || dropboxResultResp.path_lower || "";
      const sharedLinkResp = dropboxPathResp ? `https://www.dropbox.com/home${encodeURI(dropboxPathResp)}` : "";
      firmaResponsableInfo = {
        uploaded: true,
        name: fileNameResp,
        dropboxPath: dropboxPathResp,
        dropboxId: dropboxResultResp.id,
        sharedLink: sharedLinkResp,
      };
    } catch (error) {
      logger.error("Error subiendo firma del responsable a Dropbox", { error: error.message });
      firmaResponsableInfo = { uploaded: false, error: error.message };
    }
  }

  const reportText = `INFORME DE LIMPIEZA PLANTA
===========================

Empleado: ${employeeId}
Zona: ${payload.zonaNombre || payload.zona}
Periodo: ${periodo}
Firma (nombre empleado): ${payload.firmaNombreEmpleado || "N/A"}
Firma imagen: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}
Fecha: ${payload.fecha}
Hora: ${payload.hora}

Limpieza completada: ${payload.limpiezaCompletada ? "Sí" : "No"}

Tipo de Informe: LIMPIEZA_PLANTA
Registrado por: ${employeeId}
Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoInforme: "LIMPIEZA_PLANTA",
    zona: payload.zona,
    zonaNombre: payload.zonaNombre || payload.zona,
    periodo,
    limpiezaCompletada: payload.limpiezaCompletada === true || payload.limpiezaCompletada === "true" || payload.limpiezaCompletada === "SI",
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    firmaNombreResponsable: payload.firmaNombreResponsable || null,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Cleaning plant report created", {
    employeeId,
    reportId: result.insertedId,
    zona: payload.zona,
  });

  setCorsHeaders(req, res);
  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Informe de Limpieza Planta creado correctamente",
  });
}));

// Listar informes de Limpieza Planta
exports.listCleaningPlantReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(CLEANING_PLANT_REPORTS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  const enriched = await Promise.all(
    reports.map(async (report) => ({
      id: report._id,
      employee_id: report.employee_id,
      fecha: report.fecha,
      hora: report.hora,
      tipoInforme: report.tipoInforme,
      zona: report.zona,
      zonaNombre: report.zonaNombre,
      periodo: report.periodo || "SEMANAL",
      firmaNombreResponsable: report.firmaNombreResponsable || (report.datosCompletos && report.datosCompletos.firmaNombreResponsable) || null,
      limpiezaCompletada: report.limpiezaCompletada,
      firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
      texto: report.texto,
      datosCompletos: report.datosCompletos,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  );
  res.json(enriched);
}));

// Actualizar informe de Limpieza Planta
exports.updateCleaningPlantReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;

  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CLEANING_PLANT_REPORTS_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.periodo !== undefined && ["SEMANAL", "MENSUAL", "TRIMESTRAL", "ANUAL"].includes(payload.periodo)) updateFields.periodo = payload.periodo;
  if (payload.limpiezaCompletada !== undefined) updateFields.limpiezaCompletada = payload.limpiezaCompletada;
  if (payload.firmaNombreResponsable !== undefined) updateFields.firmaNombreResponsable = payload.firmaNombreResponsable || null;

  const periodoDisplay = updateFields.periodo || existing.periodo || "SEMANAL";
  // If signature images are provided in payload, upload them using the (possibly) updated periodo
  try {
    const zonaNombre = (existing.zonaNombre || existing.zona || "GENERAL").replace(/[/\\]/g, "-").trim();
    const folder = `LIMPIEZA PLANTA/${zonaNombre}/${periodoDisplay}`;

    if (payload.firmaImagenBase64) {
      // delete previous file if any
      if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
        await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_limpieza_planta"});
      }
      const fechaForName = (payload.fecha || existing.fecha || "").replace(/[^0-9]/g, "") || new Date().toISOString().slice(0,10).replace(/-/g, "");
      const safeName = String(existing.employee_id || "EMPLEADO").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0,20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, folder);
      const dropboxPath = dropboxResult.path_display || dropboxResult.path_lower || "";
      updateFields.firmaInfo = { uploaded: true, name: fileName, dropboxPath, dropboxId: dropboxResult.id, sharedLink: dropboxPath ? `https://www.dropbox.com/home${encodeURI(dropboxPath)}` : "" };
    }

    if (payload.firmaImagenBase64Responsable) {
      if (existing.firmaResponsableInfo && existing.firmaResponsableInfo.dropboxPath) {
        await deleteDropboxFileIfExists(existing.firmaResponsableInfo.dropboxPath, {reportId: id, type: "firma_responsable_limpieza_planta"});
      }
      const fechaForNameResp = (payload.fecha || existing.fecha || "").replace(/[^0-9]/g, "") || new Date().toISOString().slice(0,10).replace(/-/g, "");
      const safeNameResp = String(payload.firmaNombreResponsable || "RESPONSABLE").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0,20);
      const fileNameResp = `${fechaForNameResp}_${safeNameResp}.png`;
      const dropboxResultResp = await uploadFormularioSignatureResponsableFromDataUrl(payload.firmaImagenBase64Responsable, fileNameResp, folder);
      const dropboxPathResp = dropboxResultResp.path_display || dropboxResultResp.path_lower || "";
      updateFields.firmaResponsableInfo = { uploaded: true, name: fileNameResp, dropboxPath: dropboxPathResp, dropboxId: dropboxResultResp.id, sharedLink: dropboxPathResp ? `https://www.dropbox.com/home${encodeURI(dropboxPathResp)}` : "" };
    }
  } catch (errUpload) {
    logger.warn("Error uploading signature during updateCleaningPlantReport", { error: errUpload.message });
  }
  const reportText = `INFORME DE LIMPIEZA PLANTA
===========================

Empleado: ${existing.employee_id}
Zona: ${existing.zonaNombre || existing.zona}
Periodo: ${periodoDisplay}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

Limpieza completada: ${updateFields.limpiezaCompletada !== undefined ? (updateFields.limpiezaCompletada ? "Sí" : "No") : (existing.limpiezaCompletada ? "Sí" : "No")}

Tipo de Informe: LIMPIEZA_PLANTA
Registrado por: ${existing.employee_id}
Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Cleaning plant report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    tipoInforme: updated.tipoInforme,
    zona: updated.zona,
    zonaNombre: updated.zonaNombre,
    periodo: updated.periodo || "SEMANAL",
    limpiezaCompletada: updated.limpiezaCompletada,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Eliminar informe de Limpieza Planta
exports.deleteCleaningPlantReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;

  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CLEANING_PLANT_REPORTS_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_limpieza_planta"});
  }
  if (existing.firmaResponsableInfo && existing.firmaResponsableInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaResponsableInfo.dropboxPath, {reportId: id, type: "firma_responsable_limpieza_planta"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});

  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Cleaning plant report deleted", {reportId: id});

  res.json({
    success: true,
    message: "Informe eliminado correctamente",
    id,
  });
}));

// Actualizar informe de control de residuos
exports.updateControlResiduesReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;

  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_RESIDUES_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.paletsCarton !== undefined) updateFields.paletsCarton = payload.paletsCarton;
  if (payload.paletsPlastico !== undefined) updateFields.paletsPlastico = payload.paletsPlastico;
  if (payload.paletsFilm !== undefined) updateFields.paletsFilm = payload.paletsFilm;
  if (payload.nombreResponsable !== undefined) updateFields.nombreResponsable = payload.nombreResponsable;

  const reportText = `CONTROL DE RESIDUOS
=====================

Empleado que registra: ${existing.employee_id}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

Palets cartón: ${updateFields.paletsCarton !== undefined ? updateFields.paletsCarton : existing.paletsCarton}
Palets plástico: ${updateFields.paletsPlastico !== undefined ? updateFields.paletsPlastico : existing.paletsPlastico}
Palets film: ${updateFields.paletsFilm !== undefined ? updateFields.paletsFilm : existing.paletsFilm}
Nombre responsable: ${updateFields.nombreResponsable || existing.nombreResponsable}
Firma responsable: ${existing.firmaInfo && existing.firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Control residues report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    paletsCarton: updated.paletsCarton,
    paletsPlastico: updated.paletsPlastico,
    paletsFilm: updated.paletsFilm,
    nombreResponsable: updated.nombreResponsable,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Actualizar informe de control de expedición
exports.updateControlExpeditionReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;

  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_EXPEDICION_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.producto !== undefined) updateFields.producto = payload.producto;
  if (payload.lote !== undefined) updateFields.lote = payload.lote;
  if (payload.numeroPalet !== undefined) {
    const numeroPalet = Number(payload.numeroPalet);
    if (Number.isNaN(numeroPalet)) {
      res.status(400).json({error: "INVALID_NUMERO_PALET", message: "El número de palet debe ser numérico"});
      return;
    }
    updateFields.numeroPalet = numeroPalet;
  }
  if (payload.paletIntegro !== undefined) updateFields.paletIntegro = payload.paletIntegro;
  if (payload.flejadoOK !== undefined) updateFields.flejadoOK = payload.flejadoOK;
  if (payload.etiquetaCorrecta !== undefined) updateFields.etiquetaCorrecta = payload.etiquetaCorrecta;
  if (payload.conteoCorrecto !== undefined) updateFields.conteoCorrecto = payload.conteoCorrecto;
  if (payload.responsable !== undefined) updateFields.responsable = payload.responsable;

  const reportText = `CONTROL DE EXPEDICIÓN
======================

Empleado que registra: ${existing.employee_id}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

Producto: ${updateFields.producto || existing.producto}
Lote: ${updateFields.lote || existing.lote}
Número palet: ${updateFields.numeroPalet !== undefined ? updateFields.numeroPalet : existing.numeroPalet}
Palet íntegro: ${updateFields.paletIntegro || existing.paletIntegro}
Flejado OK: ${updateFields.flejadoOK || existing.flejadoOK}
Etiqueta correcta: ${updateFields.etiquetaCorrecta || existing.etiquetaCorrecta}
Conteo correcto: ${updateFields.conteoCorrecto || existing.conteoCorrecto}
Responsable: ${updateFields.responsable || existing.responsable}
Firma responsable: ${existing.firmaInfo && existing.firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Control expedition report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    producto: updated.producto,
    lote: updated.lote,
    numeroPalet: updated.numeroPalet,
    paletIntegro: updated.paletIntegro,
    flejadoOK: updated.flejadoOK,
    etiquetaCorrecta: updated.etiquetaCorrecta,
    conteoCorrecto: updated.conteoCorrecto,
    responsable: updated.responsable,
    firmaInfo: updated.firmaInfo,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Actualizar informe de control agua diario
exports.updateControlAguaDiarioReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;

  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_DIARIO_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.temperaturaCalentador !== undefined) updateFields.temperaturaCalentador = payload.temperaturaCalentador;
  if (payload.cloroDeposito !== undefined) updateFields.cloroDeposito = payload.cloroDeposito;
  if (payload.phDeposito !== undefined) updateFields.phDeposito = payload.phDeposito;

  const reportText = `CONTROL AGUA DIARIO
====================

Empleado: ${existing.employee_id}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

Temperatura calentador (≥60ºC): ${updateFields.temperaturaCalentador || existing.temperaturaCalentador}
Cloro depósito (0,2-1 PPM): ${updateFields.cloroDeposito || existing.cloroDeposito}
pH depósito (6,5-8,5): ${updateFields.phDeposito || existing.phDeposito}

Firma (nombre empleado): ${existing.firmaNombreEmpleado || "N/A"}
Firma imagen: ${existing.firmaInfo && existing.firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Control agua diario report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    temperaturaCalentador: updated.temperaturaCalentador,
    cloroDeposito: updated.cloroDeposito,
    phDeposito: updated.phDeposito,
    firmaInfo: updated.firmaInfo,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Actualizar informe de control agua semanal
exports.updateControlAguaSemanalReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;

  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_SEMANAL_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.turbidezCalentador !== undefined) updateFields.turbidezCalentador = payload.turbidezCalentador;
  if (payload.turbidezDeposito !== undefined) updateFields.turbidezDeposito = payload.turbidezDeposito;
  if (payload.purgaPuntos !== undefined) updateFields.purgaPuntos = payload.purgaPuntos;
  if (payload.turbidezPuntos !== undefined) updateFields.turbidezPuntos = payload.turbidezPuntos;

  const reportText = `CONTROL AGUA SEMANAL
====================

Empleado: ${existing.employee_id}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

Turbidez calentador (<4 UNF): ${updateFields.turbidezCalentador || existing.turbidezCalentador}
Turbidez depósito (<4 UNF): ${updateFields.turbidezDeposito || existing.turbidezDeposito}
Purga puntos poco uso (Tº en purga ≥ 50 ºC): ${updateFields.purgaPuntos || existing.purgaPuntos}
Turbidez puntos terminales (<4 UNF): ${updateFields.turbidezPuntos || existing.turbidezPuntos}

Firma (nombre empleado): ${existing.firmaNombreEmpleado || "N/A"}
Firma imagen: ${existing.firmaInfo && existing.firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Control agua semanal report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    turbidezCalentador: updated.turbidezCalentador,
    turbidezDeposito: updated.turbidezDeposito,
    purgaPuntos: updated.purgaPuntos,
    turbidezPuntos: updated.turbidezPuntos,
    firmaInfo: updated.firmaInfo,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Actualizar informe de control agua mensual
exports.updateControlAguaMensualReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;

  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_MENSUAL_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.suciedadCorrosion !== undefined) updateFields.suciedadCorrosion = payload.suciedadCorrosion;
  if (payload.tempFria !== undefined) updateFields.tempFria = payload.tempFria;
  if (payload.tempCaliente !== undefined) updateFields.tempCaliente = payload.tempCaliente;
  if (payload.cloroPuntos !== undefined) updateFields.cloroPuntos = payload.cloroPuntos;

  const reportText = `CONTROL AGUA MENSUAL
====================

Empleado: ${existing.employee_id}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

Suciedad o corrosión: ${updateFields.suciedadCorrosion || existing.suciedadCorrosion}
Tº < 20 ºC (fría): ${updateFields.tempFria || existing.tempFria}
Tº ≥ 50 ºC (caliente): ${updateFields.tempCaliente || existing.tempCaliente}
Cloro 0,2-1: ${updateFields.cloroPuntos || existing.cloroPuntos}

Firma (nombre empleado): ${existing.firmaNombreEmpleado || "N/A"}
Firma imagen: ${existing.firmaInfo && existing.firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Control agua mensual report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    suciedadCorrosion: updated.suciedadCorrosion,
    tempFria: updated.tempFria,
    tempCaliente: updated.tempCaliente,
    cloroPuntos: updated.cloroPuntos,
    firmaInfo: updated.firmaInfo,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Actualizar informe de control agua trimestral
exports.updateControlAguaTrimestralReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {id} = req.query;

  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_TRIMESTRAL_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updateFields = {updatedAt: new Date()};
  if (payload.fecha !== undefined) updateFields.fecha = payload.fecha;
  if (payload.hora !== undefined) updateFields.hora = payload.hora;
  if (payload.suciedadCorrosion !== undefined) updateFields.suciedadCorrosion = payload.suciedadCorrosion;

  const reportText = `CONTROL AGUA TRIMESTRAL
=======================

Empleado: ${existing.employee_id}
Fecha: ${updateFields.fecha || existing.fecha}
Hora: ${updateFields.hora || existing.hora}

Suciedad o corrosión: ${updateFields.suciedadCorrosion || existing.suciedadCorrosion}

Firma (nombre empleado): ${existing.firmaNombreEmpleado || "N/A"}
Firma imagen: ${existing.firmaInfo && existing.firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}

Fecha de creación: ${existing.createdAt ? new Date(existing.createdAt).toISOString() : "N/A"}
Última actualización: ${new Date().toISOString()}`;

  updateFields.texto = reportText;

  const result = await collection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  if (result.matchedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  const updated = await collection.findOne({_id: new ObjectId(id)});
  logger.info("Control agua trimestral report updated", {reportId: id});

  res.json({
    id: updated._id,
    employee_id: updated.employee_id,
    fecha: updated.fecha,
    hora: updated.hora,
    suciedadCorrosion: updated.suciedadCorrosion,
    firmaInfo: updated.firmaInfo,
    texto: updated.texto,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}));

// Eliminar informe de control de residuos
exports.deleteControlResiduesReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;

  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_RESIDUES_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  // Intentar borrar firma en Dropbox antes de eliminar el informe
  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_control_residuos"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});

  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Control residues report deleted", {reportId: id});

  res.json({
    success: true,
    message: "Informe eliminado correctamente",
    id,
  });
}));

// Eliminar informe de control de expedición
exports.deleteControlExpeditionReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;

  if (!id) {
    res.status(400).json({error: "ID_REQUIRED", message: "Se requiere el ID del informe"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_EXPEDICION_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  if (existing.firmaInfo && existing.firmaInfo.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath, {reportId: id, type: "firma_control_expedicion"});
  }

  const result = await collection.deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  logger.info("Control expedition report deleted", {reportId: id});

  res.json({
    success: true,
    message: "Informe eliminado correctamente",
    id,
  });
}));
