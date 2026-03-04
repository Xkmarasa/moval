/* eslint-disable require-jsdoc */
// Informes Iniciales
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl} = require("../dropbox");
const {INITIAL_REPORTS_COLLECTION} = require("../config");
const {ObjectId} = require("mongodb");

exports.createInitialReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  if (!employeeId || !payload.fecha || !payload.hora) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  const db = await getDb();
  const now = new Date();
  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fileName = `${payload.fecha}_${employeeId}.png`;
      const result = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "INICIAL");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: result.path_display};
    } catch (e) { firmaInfo = {uploaded: false, error: e.message}; }
  }

  const doc = {
    employee_id: String(employeeId).trim(), fecha: payload.fecha, hora: payload.hora, tipoInforme: "INICIAL",
    instalacionesLimpias: payload.instalacionesLimpias, manipuladoresUniformados: payload.manipuladoresUniformados,
    peloProtegido: payload.peloProtegido, unasLimpias: payload.unasLimpias, elementosTamiz: payload.elementosTamiz,
    calibracionPHMetro: payload.calibracionPHMetro, firmaInfo, createdAt: now, updatedAt: now,
  };
  const result = await db.collection(INITIAL_REPORTS_COLLECTION).insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listInitialReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const db = await getDb();
  const filter = employeeId ? {employee_id: employeeId} : {};
  const reports = await db.collection(INITIAL_REPORTS_COLLECTION).find(filter).sort({createdAt: -1}).limit(parseInt(limit) || 200).toArray();
  res.json(reports);
}));

exports.updateInitialReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const payload = normalizeBody(req.body);
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  await db.collection(INITIAL_REPORTS_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: {updatedAt: new Date()}});
  res.json({success: true});
}));

exports.deleteInitialReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(INITIAL_REPORTS_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await db.collection(INITIAL_REPORTS_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

