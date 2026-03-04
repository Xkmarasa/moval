/* eslint-disable require-jsdoc */
// Informes de Testigos
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, setCorsHeaders, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl, ensureSharedLink} = require("../dropbox");
const {WITNESS_REPORTS_COLLECTION} = require("../config");
const logger = require("firebase-functions/logger");
const {ObjectId} = require("mongodb");

// Normalize witness types
const normalizeWitnessTypes = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => item && String(item).trim() !== "");
  }
  if (typeof value === "string" && value.trim() !== "") {
    return [value.trim()];
  }
  return [];
};

exports.createWitnessReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  const witnessTypes = normalizeWitnessTypes(payload.tipoTestigo);

  if (!employeeId || !payload.fecha || !payload.hora || witnessTypes.length === 0) {
    res.status(400).json({error: "MISSING_FIELDS", message: "employee_id, fecha, hora y tipoTestigo son obligatorios"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(WITNESS_REPORTS_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeEmployee = String(employeeId).replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeEmployee}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "TESTIGOS");
      firmaInfo = {
        uploaded: true,
        name: fileName,
        dropboxPath: dropboxResult.path_display,
        sharedLink: dropboxResult.sharedLink,
      };
    } catch (error) {
      logger.error("Error uploading witness signature", {error: error.message});
      firmaInfo = {uploaded: false, error: error.message};
    }
  }

  const reportText = `REGISTRO DE TESTIGOS
====================
Empleado: ${employeeId}
Fecha: ${payload.fecha}
Hora: ${payload.hora}
Tipo de testigo: ${witnessTypes.join(", ")}
Firma: ${firmaInfo && firmaInfo.uploaded ? "Subida a Dropbox" : "No disponible"}
Fecha de creación: ${now.toISOString()}`;

  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: payload.fecha,
    hora: payload.hora,
    tipoTestigo: witnessTypes,
    firmaNombreEmpleado: payload.firmaNombreEmpleado || null,
    firmaInfo,
    texto: reportText,
    datosCompletos: payload,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Witness report created", {employeeId, reportId: result.insertedId});

  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listWitnessReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 200, 1000);

  const db = await getDb();
  const collection = db.collection(WITNESS_REPORTS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const reports = await collection.find(filter).sort({createdAt: -1}).limit(numericLimit).toArray();

  const enriched = await Promise.all(reports.map(async (report) => ({
    id: report._id,
    employee_id: report.employee_id,
    fecha: report.fecha,
    hora: report.hora,
    tipoTestigo: report.tipoTestigo,
    firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
    texto: report.texto,
    createdAt: report.createdAt,
  })));

  res.json(enriched);
}));

exports.deleteWitnessReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(WITNESS_REPORTS_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND"});
    return;
  }

  if (existing.firmaInfo?.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  }

  await collection.deleteOne({_id: new ObjectId(id)});
  logger.info("Witness report deleted", {reportId: id});

  res.json({success: true, message: "Informe eliminado correctamente"});
}));

