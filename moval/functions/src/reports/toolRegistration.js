/* eslint-disable require-jsdoc */
// Registro de Herramientas
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl} = require("../dropbox");
const {TOOLS_COLLECTION} = require("../config");
const {ObjectId} = require("mongodb");

exports.createToolReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const {nombre, tipo, cantidad, ubicacion, observaciones, persona, firmaImagenBase64} = payload;
  if (!nombre || !tipo || !cantidad) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  const db = await getDb();
  const now = new Date();
  let firmaInfo = null;
  if (firmaImagenBase64) {
    try {
      const fileName = `tool_${now.getTime()}.png`;
      const result = await uploadFormularioSignatureFromDataUrl(firmaImagenBase64, fileName, "HERRAMIENTAS");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: result.path_display};
    } catch (e) { firmaInfo = {uploaded: false}; }
  }

  const doc = {nombre, tipo, cantidad, ubicacion: ubicacion || "", observaciones: observaciones || "", persona: persona || "", firmaInfo, createdAt: now, updatedAt: now};
  const result = await db.collection(TOOLS_COLLECTION).insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listToolReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const {limit = "200", tipo} = req.query;
  const db = await getDb();
  const filter = tipo ? {tipo} : {};
  const reports = await db.collection(TOOLS_COLLECTION).find(filter).sort({createdAt: -1}).limit(parseInt(limit) || 200).toArray();
  res.json(reports);
}));

exports.updateToolReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const payload = normalizeBody(req.body);
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  await db.collection(TOOLS_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: {updatedAt: new Date()}});
  res.json({success: true});
}));

exports.deleteToolReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(TOOLS_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await db.collection(TOOLS_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

