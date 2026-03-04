/* eslint-disable require-jsdoc */
// Informes de Limpieza
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl, ensureSharedLink} = require("../dropbox");
const {CLEANING_REPORTS_COLLECTION, dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret} = require("../config");
const logger = require("firebase-functions/logger");
const {ObjectId} = require("mongodb");

exports.createCleaningReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  if (!employeeId || !payload.fecha || !payload.hora) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  const db = await getDb();
  const collection = db.collection(CLEANING_REPORTS_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fileName = `${payload.fecha}_${employeeId}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "LIMPIEZA");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display};
    } catch (e) { firmaInfo = {uploaded: false, error: e.message}; }
  }

  const reportText = `INFORME DE LIMPIEZA\nFecha: ${payload.fecha}\nHora: ${payload.hora}\nControl superficies: ${payload.controlSuperficies}`;
  const doc = {
    employee_id: String(employeeId).trim(), fecha: payload.fecha, hora: payload.hora, tipoInforme: "LIMPIEZA",
    controlSuperficies: payload.controlSuperficies, desengrasantePorLitro: payload.desengrasantePorLitro,
    desinfectantePorLitro: payload.desinfectantePorLitro, phAclarado: payload.phAclarado, phGrifo: payload.phGrifo,
    firmaInfo, texto: reportText, createdAt: now, updatedAt: now,
  };
  const result = await collection.insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listCleaningReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const db = await getDb();
  const reports = await db.collection(CLEANING_REPORTS_COLLECTION).find({}).sort({createdAt: -1}).limit(200).toArray();
  const enriched = await Promise.all(reports.map(async (r) => ({
    id: r._id, employee_id: r.employee_id, fecha: r.fecha, hora: r.hora, controlSuperficies: r.controlSuperficies,
    firmaInfo: await ensureSharedLink(db.collection(CLEANING_REPORTS_COLLECTION), r._id, r.firmaInfo),
  })));
  res.json(enriched);
}));

exports.updateCleaningReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const payload = normalizeBody(req.body);
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  const updateFields = {updatedAt: new Date()};
  if (payload.fecha) updateFields.fecha = payload.fecha;
  if (payload.hora) updateFields.hora = payload.hora;
  if (payload.controlSuperficies !== undefined) updateFields.controlSuperficies = payload.controlSuperficies;
  await db.collection(CLEANING_REPORTS_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: updateFields});
  res.json({success: true});
}));

exports.deleteCleaningReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(CLEANING_REPORTS_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await db.collection(CLEANING_REPORTS_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

