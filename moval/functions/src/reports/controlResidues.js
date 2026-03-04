/* eslint-disable require-jsdoc */
// Informes de Control de Residuos
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl, ensureSharedLink} = require("../dropbox");
const {CONTROL_RESIDUES_COLLECTION} = require("../config");
const logger = require("firebase-functions/logger");
const {ObjectId} = require("mongodb");

exports.createControlResiduesReport = onRequest({secrets: []}, withCors(async (req, res) => {
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
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display};
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

exports.listControlResiduesReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const db = await getDb();
  const reports = await db.collection(CONTROL_RESIDUES_COLLECTION).find({}).sort({createdAt: -1}).limit(200).toArray();
  res.json(reports.map(r => ({id: r._id, employee_id: r.employee_id, fecha: r.fecha, hora: r.hora, paletsCarton: r.paletsCarton, paletsPlastico: r.paletsPlastico, paletsFilm: r.paletsFilm, nombreResponsable: r.nombreResponsable})));
}));

