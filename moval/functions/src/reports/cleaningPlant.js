/* eslint-disable require-jsdoc */
// Informes de Limpieza de Planta
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl} = require("../dropbox");
const {CLEANING_PLANT_REPORTS_COLLECTION} = require("../config");
const {ObjectId} = require("mongodb");

exports.createCleaningPlantReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  if (!employeeId || !payload.fecha || !payload.hora) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  const db = await getDb();
  const now = new Date();
  let firmaInfo = null, firmaResponsableInfo = null;
  
  if (payload.firmaImagenBase64) {
    try {
      const fileName = `${payload.fecha}_${employeeId}.png`;
      const result = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "LIMPIEZA PLANTA");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: result.path_display};
    } catch (e) { firmaInfo = {uploaded: false}; }
  }
  
  if (payload.firmaResponsable) {
    try {
      const fileName = `${payload.fecha}_resp_${employeeId}.png`;
      const result = await uploadFormularioSignatureFromDataUrl(payload.firmaResponsable, fileName, "LIMPIEZA PLANTA");
      firmaResponsableInfo = {uploaded: true, name: fileName, dropboxPath: result.path_display};
    } catch (e) { firmaResponsableInfo = {uploaded: false}; }
  }

  const doc = {employee_id: String(employeeId).trim(), fecha: payload.fecha, hora: payload.hora, tipoInforme: "LIMPIEZA_PLANTA", zones: payload.zones || {}, firmaInfo, firmaResponsableInfo, createdAt: now, updatedAt: now};
  const result = await db.collection(CLEANING_PLANT_REPORTS_COLLECTION).insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listCleaningPlantReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const db = await getDb();
  const filter = employeeId ? {employee_id: employeeId} : {};
  const reports = await db.collection(CLEANING_PLANT_REPORTS_COLLECTION).find(filter).sort({createdAt: -1}).limit(parseInt(limit) || 200).toArray();
  res.json(reports);
}));

exports.updateCleaningPlantReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const payload = normalizeBody(req.body);
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  await db.collection(CLEANING_PLANT_REPORTS_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: {updatedAt: new Date()}});
  res.json({success: true});
}));

exports.deleteCleaningPlantReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(CLEANING_PLANT_REPORTS_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  if (existing?.firmaResponsableInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaResponsableInfo.dropboxPath);
  await db.collection(CLEANING_PLANT_REPORTS_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

