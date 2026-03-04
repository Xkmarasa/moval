/* eslint-disable require-jsdoc */
// Informes de Control de Agua
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl, ensureSharedLink} = require("../dropbox");
const {CONTROL_AGUA_DIARIO_COLLECTION, CONTROL_AGUA_SEMANAL_COLLECTION, CONTROL_AGUA_MENSUAL_COLLECTION, CONTROL_AGUA_TRIMESTRAL_COLLECTION} = require("../config");
const logger = require("firebase-functions/logger");
const {ObjectId} = require("mongodb");

// Reporte Diario
exports.createControlAguaDiarioReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  const requiredFields = ["fecha", "hora", "temperaturaCalentador", "cloroDeposito", "phDeposito"];
  const missing = requiredFields.filter((f) => !payload[f]);
  if (!employeeId || missing.length > 0) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_DIARIO_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fileName = `${payload.fecha}_${employeeId}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "CONTROL AGUA/DIARIO");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display, sharedLink: dropboxResult.sharedLink};
    } catch (e) { firmaInfo = {uploaded: false, error: e.message}; }
  }

  const reportText = `CONTROL AGUA DIARIO\nFecha: ${payload.fecha}\nHora: ${payload.hora}\nTemp: ${payload.temperaturaCalentador}ºC\nCloro: ${payload.cloroDeposito} PPM\npH: ${payload.phDeposito}`;
  const doc = {employee_id: String(employeeId).trim(), fecha: payload.fecha, hora: payload.hora, tipoInforme: "CONTROL_AGUA_DIARIO", temperaturaCalentador: payload.temperaturaCalentador, cloroDeposito: payload.cloroDeposito, phDeposito: payload.phDeposito, firmaInfo, texto: reportText, createdAt: now, updatedAt: now};
  const result = await collection.insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listControlAguaDiarioReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const db = await getDb();
  const reports = await db.collection(CONTROL_AGUA_DIARIO_COLLECTION).find({}).sort({createdAt: -1}).limit(200).toArray();
  res.json(reports.map(r => ({id: r._id, fecha: r.fecha, hora: r.hora, temperaturaCalentador: r.temperaturaCalentador, cloroDeposito: r.cloroDeposito, phDeposito: r.phDeposito})));
}));

exports.deleteControlAguaDiarioReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(CONTROL_AGUA_DIARIO_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await db.collection(CONTROL_AGUA_DIARIO_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

exports.updateControlAguaDiarioReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const payload = normalizeBody(req.body);
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  const updateFields = {updatedAt: new Date()};
  if (payload.fecha) updateFields.fecha = payload.fecha;
  if (payload.hora) updateFields.hora = payload.hora;
  if (payload.temperaturaCalentador !== undefined) updateFields.temperaturaCalentador = payload.temperaturaCalentador;
  if (payload.cloroDeposito !== undefined) updateFields.cloroDeposito = payload.cloroDeposito;
  if (payload.phDeposito !== undefined) updateFields.phDeposito = payload.phDeposito;
  await db.collection(CONTROL_AGUA_DIARIO_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: updateFields});
  res.json({success: true});
}));

// Reporte Semanal
exports.createControlAguaSemanalReport = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  if (!employeeId || !payload.fecha || !payload.hora) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  const db = await getDb();
  const collection = db.collection(CONTROL_AGUA_SEMANAL_COLLECTION);
  const now = new Date();
  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fileName = `${payload.fecha}_${employeeId}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "CONTROL AGUA/SEMANAL");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display};
    } catch (e) { firmaInfo = {uploaded: false}; }
  }
  const doc = {employee_id: String(employeeId).trim(), fecha: payload.fecha, hora: payload.hora, tipoInforme: "CONTROL_AGUA_SEMANAL", turbidezCalentador: payload.turbidezCalentador, turbidezDeposito: payload.turbidezDeposito, firmaInfo, createdAt: now};
  const result = await collection.insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listControlAguaSemanalReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const db = await getDb();
  const reports = await db.collection(CONTROL_AGUA_SEMANAL_COLLECTION).find({}).sort({createdAt: -1}).limit(200).toArray();
  res.json(reports);
}));

exports.deleteControlAguaSemanalReport = onRequest({secrets: []}, withCors(async (req, res) => {
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(CONTROL_AGUA_SEMANAL_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await db.collection(CONTROL_AGUA_SEMANAL_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

exports.updateControlAguaSemanalReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const payload = normalizeBody(req.body);
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  const updateFields = {updatedAt: new Date()};
  if (payload.fecha) updateFields.fecha = payload.fecha;
  if (payload.hora) updateFields.hora = payload.hora;
  if (payload.turbidezCalentador !== undefined) updateFields.turbidezCalentador = payload.turbidezCalentador;
  if (payload.turbidezDeposito !== undefined) updateFields.turbidezDeposito = payload.turbidezDeposito;
  await db.collection(CONTROL_AGUA_SEMANAL_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: updateFields});
  res.json({success: true});
}));

// Reporte Mensual
exports.createControlAguaMensualReport = onRequest({secrets: []}, withCors(async (req, res) => {
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
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "CONTROL AGUA/MENSUAL");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display};
    } catch (e) { firmaInfo = {uploaded: false}; }
  }
  const doc = {employee_id: String(employeeId).trim(), fecha: payload.fecha, hora: payload.hora, tipoInforme: "CONTROL_AGUA_MENSUAL", suciedadCorrosion: payload.suciedadCorrosion, tempFria: payload.tempFria, tempCaliente: payload.tempCaliente, firmaInfo, createdAt: now};
  const result = await db.collection(CONTROL_AGUA_MENSUAL_COLLECTION).insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listControlAguaMensualReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const db = await getDb();
  const reports = await db.collection(CONTROL_AGUA_MENSUAL_COLLECTION).find({}).sort({createdAt: -1}).limit(200).toArray();
  res.json(reports);
}));

exports.deleteControlAguaMensualReport = onRequest({secrets: []}, withCors(async (req, res) => {
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(CONTROL_AGUA_MENSUAL_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await db.collection(CONTROL_AGUA_MENSUAL_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

exports.updateControlAguaMensualReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const payload = normalizeBody(req.body);
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  const updateFields = {updatedAt: new Date()};
  if (payload.fecha) updateFields.fecha = payload.fecha;
  if (payload.hora) updateFields.hora = payload.hora;
  if (payload.suciedadCorrosion !== undefined) updateFields.suciedadCorrosion = payload.suciedadCorrosion;
  if (payload.tempFria !== undefined) updateFields.tempFria = payload.tempFria;
  if (payload.tempCaliente !== undefined) updateFields.tempCaliente = payload.tempCaliente;
  await db.collection(CONTROL_AGUA_MENSUAL_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: updateFields});
  res.json({success: true});
}));

// Reporte Trimestral
exports.createControlAguaTrimestralReport = onRequest({secrets: []}, withCors(async (req, res) => {
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
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "CONTROL AGUA/TRIMESTRAL");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display};
    } catch (e) { firmaInfo = {uploaded: false}; }
  }
  const doc = {employee_id: String(employeeId).trim(), fecha: payload.fecha, hora: payload.hora, tipoInforme: "CONTROL_AGUA_TRIMESTRAL", suciedadCorrosion: payload.suciedadCorrosion, firmaInfo, createdAt: now};
  const result = await db.collection(CONTROL_AGUA_TRIMESTRAL_COLLECTION).insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listControlAguaTrimestralReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const db = await getDb();
  const reports = await db.collection(CONTROL_AGUA_TRIMESTRAL_COLLECTION).find({}).sort({createdAt: -1}).limit(200).toArray();
  res.json(reports);
}));

exports.deleteControlAguaTrimestralReport = onRequest({secrets: []}, withCors(async (req, res) => {
  const {id} = req.query;
  const db = await getDb();
  const existing = await db.collection(CONTROL_AGUA_TRIMESTRAL_COLLECTION).findOne({_id: new ObjectId(id)});
  if (existing?.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await db.collection(CONTROL_AGUA_TRIMESTRAL_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

exports.updateControlAguaTrimestralReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const payload = normalizeBody(req.body);
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  const updateFields = {updatedAt: new Date()};
  if (payload.fecha) updateFields.fecha = payload.fecha;
  if (payload.hora) updateFields.hora = payload.hora;
  if (payload.suciedadCorrosion !== undefined) updateFields.suciedadCorrosion = payload.suciedadCorrosion;
  await db.collection(CONTROL_AGUA_TRIMESTRAL_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: updateFields});
  res.json({success: true});
}));

