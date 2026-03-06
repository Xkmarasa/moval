/* eslint-disable require-jsdoc */
// Informes de Libro de Visitas
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl, ensureSharedLink} = require("../dropbox");
const {VISITORS_BOOK_COLLECTION, dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret} = require("../config");
const logger = require("firebase-functions/logger");
const {ObjectId} = require("mongodb");

exports.createVisitorsBookReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;

  if (!employeeId || !payload.fecha || !payload.horaEntrada || !payload.nombreApellidos || !payload.empresa || !payload.motivoVisita) {
    res.status(400).json({error: "MISSING_FIELDS", message: "Faltan campos obligatorios"});
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
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "LIBRO DE VISITAS");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display, sharedLink: dropboxResult.sharedLink};
    } catch (error) {
      logger.error("Error uploading visitor signature", {error: error.message});
      firmaInfo = {uploaded: false, error: error.message};
    }
  }

  const reportText = `LIBRO DE VISITAS
=================
Empleado: ${employeeId}
Fecha: ${payload.fecha}
Hora entrada: ${payload.horaEntrada}
Hora salida: ${payload.horaSalida || "N/A"}
Nombre: ${payload.nombreApellidos}
DNI: ${payload.dni || "N/A"}
Empresa: ${payload.empresa}
Motivo: ${payload.motivoVisita}
Firma: ${firmaInfo?.uploaded ? "Subida a Dropbox" : "No disponible"}`;

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
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listVisitorsBookReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const db = await getDb();
  const collection = db.collection(VISITORS_BOOK_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};
  const reports = await collection.find(filter).sort({createdAt: -1}).limit(parseInt(limit) || 200).toArray();
  
  const enriched = await Promise.all(reports.map(async (r) => ({
    id: r._id,
    employee_id: r.employee_id,
    fecha: r.fecha,
    horaEntrada: r.horaEntrada,
    horaSalida: r.horaSalida,
    nombreApellidos: r.nombreApellidos,
    dni: r.dni,
    empresa: r.empresa,
    motivoVisita: r.motivoVisita,
    haLeidoNormas: r.haLeidoNormas,
    firmaNombreVisitante: r.firmaNombreVisitante,
    firmaInfo: await ensureSharedLink(collection, r._id, r.firmaInfo),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })));
  res.json(enriched);
}));

exports.saveVisitorsBookDraft = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  
  // Validar campos mínimos requeridos
  if (!employeeId || !payload.fecha || !payload.horaEntrada || !payload.nombreApellidos) {
    res.status(400).json({
      error: "MISSING_FIELDS", 
      message: "Se requieren: employee_id, fecha, horaEntrada y nombreApellidos"
    });
    return;
  }
  
  const db = await getDb();
  const collection = db.collection(VISITORS_BOOK_COLLECTION);
  const now = new Date();
  
  // Si existe un draftId, actualizar el documento existente
  if (payload.draftId) {
    const updateDoc = {
      $set: {
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
        updatedAt: now,
      }
    };
    try {
      await collection.updateOne(
        {_id: new ObjectId(payload.draftId)},
        updateDoc
      );
      res.status(200).json({id: payload.draftId, success: true, updated: true});
      return;
    } catch (e) {
      // Si falla la actualización, continuar para crear nuevo documento
      logger.warn("Failed to update draft, creating new one", {error: e.message});
    }
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
    completo: false, 
    createdAt: now, 
    updatedAt: now,
  };
  const result = await collection.insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.deleteVisitorsBookReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  const collection = db.collection(VISITORS_BOOK_COLLECTION);
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) { res.status(404).json({error: "NOT_FOUND"}); return; }
  if (existing.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await collection.deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

// List Visitors Book Drafts - lista borradores (informes incompletos)
exports.listVisitorsBookDrafts = onRequest(withCors(async (req, res) => {
  const {limit = "100", employeeId} = req.query;
  const db = await getDb();
  const collection = db.collection(VISITORS_BOOK_COLLECTION);
  const filter = {completo: false};
  if (employeeId) {
    filter.employee_id = employeeId;
  }
  const drafts = await collection.find(filter).sort({createdAt: -1}).limit(parseInt(limit) || 100).toArray();
  res.json(drafts.map(r => ({
    id: r._id,
    employee_id: r.employee_id,
    fecha: r.fecha,
    horaEntrada: r.horaEntrada,
    nombreApellidos: r.nombreApellidos,
    empresa: r.empresa,
    completo: r.completo,
    createdAt: r.createdAt,
  })));
}));

