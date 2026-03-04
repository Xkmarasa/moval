/* eslint-disable require-jsdoc */
// Informes de Producción
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl} = require("../dropbox");
const {PRODUCTION_REPORTS_COLLECTION, dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret} = require("../config");
const {ObjectId} = require("mongodb");

exports.createProductionReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  if (!employeeId || !payload.fecha || !payload.hora || !payload.tipoProducto) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  const db = await getDb();
  const now = new Date();
  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fileName = `${payload.fecha}_${employeeId}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "PRODUCCION");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display};
    } catch (e) { firmaInfo = {uploaded: false}; }
  }

  const doc = {
    employee_id: String(employeeId).trim(), fecha: payload.fecha, hora: payload.hora, tipoInforme: "PRODUCCION",
    tipoProducto: payload.tipoProducto, color: payload.color, olor: payload.olor, sabor: payload.sabor,
    textura: payload.textura, phPcc2: payload.phPcc2, numeroCampana: payload.numeroCampana, firmaInfo,
    createdAt: now, updatedAt: now,
  };
  const result = await db.collection(PRODUCTION_REPORTS_COLLECTION).insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listProductionReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const db = await getDb();
  const reports = await db.collection(PRODUCTION_REPORTS_COLLECTION).find({}).sort({createdAt: -1}).limit(200).toArray();
  res.json(reports.map(r => ({id: r._id, employee_id: r.employee_id, fecha: r.fecha, hora: r.hora, tipoProducto: r.tipoProducto, phPcc2: r.phPcc2})));
}));

exports.deleteProductionReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(PRODUCTION_REPORTS_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await db.collection(PRODUCTION_REPORTS_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

