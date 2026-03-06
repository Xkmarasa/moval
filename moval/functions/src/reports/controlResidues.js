/* eslint-disable require-jsdoc */
// Informes de Control de Residuos
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl, ensureSharedLink} = require("../dropbox");
const {CONTROL_RESIDUES_COLLECTION, dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret} = require("../config");
const logger = require("firebase-functions/logger");
const {ObjectId} = require("mongodb");

exports.createControlResiduesReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  if (!employeeId || !payload.fecha || !payload.hora || payload.paletsCarton === undefined || !payload.nombreResponsable) {
    res.status(400).json({error: "MISSING_FIELDS"}); return;
  }

  const db = await getDb();
  const collection = db.collection(CONTROL_RESIDUES_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fileName = `${payload.fecha}_${payload.nombreResponsable}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "CONTROL DE RESIDUOS");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display, sharedLink: dropboxResult.sharedLink};
    } catch (e) { firmaInfo = {uploaded: false, error: e.message}; }
  }

  const doc = {
    employee_id: String(employeeId).trim(), fecha: payload.fecha, hora: payload.hora,
    paletsCarton: payload.paletsCarton, paletsPlastico: payload.paletsPlastico, paletsFilm: payload.paletsFilm,
    nombreResponsable: payload.nombreResponsable, firmaInfo, createdAt: now, updatedAt: now,
  };
  const result = await collection.insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listControlResiduesReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const db = await getDb();
  const collection = db.collection(CONTROL_RESIDUES_COLLECTION);
  const reports = await collection.find({}).sort({createdAt: -1}).limit(200).toArray();
  
  // Enrich reports with shared links for signatures
  const enriched = await Promise.all(reports.map(async (report) => ({
    id: report._id,
    employee_id: report.employee_id,
    fecha: report.fecha,
    hora: report.hora,
    paletsCarton: report.paletsCarton,
    paletsPlastico: report.paletsPlastico,
    paletsFilm: report.paletsFilm,
    nombreResponsable: report.nombreResponsable,
    firmaInfo: await ensureSharedLink(collection, report._id, report.firmaInfo),
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  })));
  
  res.json(enriched);
}));

