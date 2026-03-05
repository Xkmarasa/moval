/* eslint-disable require-jsdoc */
// Informes de Peso Producto
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl} = require("../dropbox");
const {WEIGHT_REPORTS_COLLECTION, dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret} = require("../config");
const {ObjectId} = require("mongodb");

const normalizePesos = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (item === "" || item === null || item === undefined) return null;
    const num = Number(item);
    return Number.isNaN(num) ? null : num;
  });
};

exports.createWeightReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  if (!employeeId || !payload.fecha || !payload.hora) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  const db = await getDb();
  const now = new Date();
  const pesos = normalizePesos(payload.pesos);
  const count = pesos.length;
  const sum = pesos.reduce((acc, v) => acc + v, 0);
  const min = Math.min(...pesos);
  const max = Math.max(...pesos);
  const avg = count > 0 ? sum / count : 0;

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fileName = `${payload.fecha}_${employeeId}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "PESO PRODUCTO");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display};
    } catch (e) { firmaInfo = {uploaded: false}; }
  }

  const doc = {
    employee_id: String(employeeId).trim(), fecha: payload.fecha, hora: payload.hora, tipoInforme: "PESO_PRODUCTO",
    envaseCantidad: payload.envaseCantidad, pesos, min, max, promedio: avg, resumenPesos: {cantidad: count, minimo: min, maximo: max, promedio: avg},
    firmaInfo, completo: true, createdAt: now, updatedAt: now,
  };
  const result = await db.collection(WEIGHT_REPORTS_COLLECTION).insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.saveWeightDraft = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  if (!employeeId || !payload.fecha) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  const db = await getDb();
  const now = new Date();
  const pesos = payload.pesos || [];
  const doc = {
    employee_id: String(employeeId).trim(), 
    fecha: payload.fecha, 
    hora: payload.hora || "", 
    tipoInforme: "PESO_PRODUCTO",
    envaseCantidad: payload.envaseCantidad || "",
    pesos: pesos,
    completo: false, 
    createdAt: now, 
    updatedAt: now
  };
  const result = await db.collection(WEIGHT_REPORTS_COLLECTION).insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.getPendingWeightReport = onRequest(withCors(async (req, res) => {
  const employeeId = req.query.employeeId || req.query.employee_id;
  if (!employeeId) { res.status(400).json({error: "MISSING_FIELDS"}); return; }
  const db = await getDb();
  const pending = await db.collection(WEIGHT_REPORTS_COLLECTION).findOne({employee_id: String(employeeId).trim(), completo: false}, {sort: {updatedAt: -1}});
  res.json(pending ? {
    pending: true, 
    report: {
      id: pending._id,
      fecha: pending.fecha,
      hora: pending.hora || "",
      envaseCantidad: pending.envaseCantidad || "",
      pesos: pending.pesos || []
    }
  } : {pending: false});
}));

exports.listWeightReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const db = await getDb();
  const reports = await db.collection(WEIGHT_REPORTS_COLLECTION).find({}).sort({createdAt: -1}).limit(200).toArray();
  res.json(reports.map(r => ({id: r._id, employee_id: r.employee_id, fecha: r.fecha, hora: r.hora, promedio: r.promedio, completo: r.completo})));
}));

exports.deleteWeightReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(WEIGHT_REPORTS_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await db.collection(WEIGHT_REPORTS_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

// List Weight Drafts - lista borradores (informes incompletos)
exports.listWeightDrafts = onRequest(withCors(async (req, res) => {
  const {limit = "100", employeeId} = req.query;
  const db = await getDb();
  const filter = {completo: false};
  if (employeeId) {
    filter.employee_id = String(employeeId).trim();
  }
  const drafts = await db.collection(WEIGHT_REPORTS_COLLECTION).find(filter).sort({createdAt: -1}).limit(parseInt(limit) || 100).toArray();
  res.json(drafts.map(r => ({
    id: r._id,
    employee_id: r.employee_id,
    fecha: r.fecha,
    hora: r.hora,
    envaseCantidad: r.envaseCantidad,
    pesos: r.pesos,
    promedio: r.promedio,
    completo: r.completo,
    createdAt: r.createdAt,
  })));
}));
