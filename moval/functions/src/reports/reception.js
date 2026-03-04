/* eslint-disable require-jsdoc */
// Informes de Recepción y Salida de Mercancía
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl, ensureSharedLink} = require("../dropbox");
const {RECEPTION_EXIT_COLLECTION, dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret} = require("../config");
const logger = require("firebase-functions/logger");
const {ObjectId} = require("mongodb");

exports.createReceptionExitReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  const requiredFields = ["employee_id", "tipoMovimiento", "empresa", "nombreTransportista", "fecha", "producto", "identificacionProducto", "estadoCajas", "higieneCamion", "estadoPalets", "aceptado", "quienRecepciona", "nombreConductor"];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length > 0) { res.status(400).json({error: "MISSING_FIELDS", message: `Faltan: ${missing.join(", ")}`}); return; }

  const db = await getDb();
  const collection = db.collection(RECEPTION_EXIT_COLLECTION);
  const now = new Date();

  let firmaInfo = null;
  if (payload.firmaImagenBase64) {
    try {
      const fechaForName = (payload.fecha || "").replace(/[^0-9]/g, "") || now.toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = String(payload.nombreConductor || "CONDUCTOR").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase().slice(0, 20);
      const fileName = `${fechaForName}_${safeName}.png`;
      const dropboxResult = await uploadFormularioSignatureFromDataUrl(payload.firmaImagenBase64, fileName, "RECEPCION Y SALIDA MERCANCIA");
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: dropboxResult.path_display, sharedLink: dropboxResult.sharedLink};
    } catch (error) { firmaInfo = {uploaded: false, error: error.message}; }
  }

  const reportText = `RECEPCIÓN Y SALIDA MERCANCÍA
Empleado: ${employeeId}
Tipo: ${payload.tipoMovimiento}
Empresa: ${payload.empresa}
Producto: ${payload.producto}
Aceptado: ${payload.aceptado}`;

  const doc = {
    employee_id: String(employeeId).trim(), tipoMovimiento: payload.tipoMovimiento, empresa: payload.empresa,
    nombreTransportista: payload.nombreTransportista, fecha: payload.fecha, producto: payload.producto,
    identificacionProducto: payload.identificacionProducto, estadoCajas: payload.estadoCajas, higieneCamion: payload.higieneCamion,
    estadoPalets: payload.estadoPalets, aceptado: payload.aceptado, quienRecepciona: payload.quienRecepciona,
    nombreConductor: payload.nombreConductor, firmaInfo, texto: reportText, createdAt: now, updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listReceptionExitReports = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  const {limit = "200", employeeId} = req.query;
  const db = await getDb();
  const collection = db.collection(RECEPTION_EXIT_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};
  const reports = await collection.find(filter).sort({createdAt: -1}).limit(parseInt(limit) || 200).toArray();
  const enriched = await Promise.all(reports.map(async (r) => ({
    id: r._id, employee_id: r.employee_id, tipoMovimiento: r.tipoMovimiento, empresa: r.empresa,
    producto: r.producto, aceptado: r.aceptado, firmaInfo: await ensureSharedLink(collection, r._id, r.firmaInfo),
  })));
  res.json(enriched);
}));

exports.deleteReceptionExitReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  const collection = db.collection(RECEPTION_EXIT_COLLECTION);
  const existing = await collection.findOne({_id: new ObjectId(id)});
  if (!existing) { res.status(404).json({error: "NOT_FOUND"}); return; }
  if (existing.firmaInfo?.dropboxPath) await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  await collection.deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

