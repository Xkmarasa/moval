/* eslint-disable require-jsdoc */
// Informes de Satisfacción del Cliente
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl} = require("../dropbox");
const {SATISFACTION_FORMS_COLLECTION, dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret} = require("../config");
const {ObjectId} = require("mongodb");

exports.createCustomerSatisfactionForm = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const {cliente, canal, fecha, firmaNombreCliente, firmaImagenBase64} = payload;
  if (!cliente || !canal || !fecha || !firmaNombreCliente || !firmaImagenBase64) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  const db = await getDb();
  const now = new Date();
  let firmaInfo = null;
  try {
    const fileName = `${fecha}_${cliente}.png`;
    const result = await uploadFormularioSignatureFromDataUrl(firmaImagenBase64, fileName, "SATISFACCION CLIENTES");
    firmaInfo = {uploaded: true, name: fileName, dropboxPath: result.path_display};
  } catch (e) { firmaInfo = {uploaded: false, error: e.message}; }

  const scores = payload.scores || {};
  const numericScores = Object.values(scores).map(v => Number(v)).filter(v => !Number.isNaN(v));
  const isg = numericScores.length > 0 ? Number((numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(2)) : null;

  const doc = {cliente, canal, fecha, firmaNombreCliente, firmaInfo, scores, isg, valoras: payload.valoras || "", mejoras: payload.mejoras || "", comentarios: payload.comentarios || "", createdAt: now, updatedAt: now};
  const result = await db.collection(SATISFACTION_FORMS_COLLECTION).insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listCustomerSatisfactionForms = onRequest({secrets: []}, withCors(async (req, res) => {
  const db = await getDb();
  const reports = await db.collection(SATISFACTION_FORMS_COLLECTION).find({}).sort({createdAt: -1}).limit(200).toArray();
  res.json(reports);
}));

exports.updateCustomerSatisfactionForm = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const payload = normalizeBody(req.body);
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  await db.collection(SATISFACTION_FORMS_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: {updatedAt: new Date()}});
  res.json({success: true});
}));

exports.deleteCustomerSatisfactionForm = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(SATISFACTION_FORMS_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await db.collection(SATISFACTION_FORMS_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

