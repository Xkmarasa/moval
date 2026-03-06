/* eslint-disable require-jsdoc */
// Firebase Functions - Punto de entrada principal
// Re-exporta todos los endpoints desde módulos separados

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

// Importar configuración
const {
  dropboxToken,
  dropboxRefreshToken,
  dropboxAppKey,
  dropboxAppSecret,
  RECORDS_COLLECTION,
  USERS_COLLECTION,
  TOOLS_COLLECTION,
  INITIAL_REPORTS_COLLECTION,
  PACKAGING_REPORTS_COLLECTION,
  PRODUCTION_REPORTS_COLLECTION,
  WEIGHT_REPORTS_COLLECTION,
  CLEANING_REPORTS_COLLECTION,
  CONTROL_RESIDUES_COLLECTION,
  CONTROL_EXPEDICION_COLLECTION,
  SATISFACTION_FORMS_COLLECTION,
  REVISION_REPORTS_COLLECTION,
} = require("./src/config");

// Importar utilidades
const {getDb} = require("./src/database");
const {getDropboxAccessToken, deleteDropboxFileIfExists, uploadToDropbox, uploadFormularioSignatureFromDataUrl, ensureSharedLink, createDropboxSharedLink} = require("./src/dropbox");
const {withCors, setCorsHeaders, normalizeBody, sanitizeUser} = require("./src/utils");

// Importar endpoints de reportes
const reports = require("./src/reports");

const logger = require("firebase-functions/logger");
const {ObjectId} = require("mongodb");

// ==========================================
// ENDPOINTS - AUTH & BASIC
// ==========================================

// Create User
exports.createUser = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const {usuario, nombre, apellidos, password, role} = payload;
  if (!usuario || !password) { res.status(400).json({error: "MISSING_FIELDS"}); return; }

  try {
    const db = await getDb();
    const collection = db.collection(USERS_COLLECTION);
    const existing = await collection.findOne({$or: [{usuario}, {username: usuario}]});
    if (existing) { res.status(409).json({error: "USER_EXISTS"}); return; }

    const passwordHash = await bcrypt.hash(password, 10);
    const doc = {usuario, nombre: nombre || "", apellidos: apellidos || "", passwordHash, role: role || "user", createdAt: new Date()};
    const result = await collection.insertOne(doc);
    logger.info("User created", {userId: result.insertedId, usuario});
    res.status(201).json({id: result.insertedId, usuario, role: doc.role});
  } catch (error) {
    logger.error("Error creating user", {error: error.message});
    res.status(500).json({error: "CREATE_USER_ERROR"});
  }
}));

// Delete Entry
exports.deleteEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }

  const db = await getDb();
  const result = await db.collection(RECORDS_COLLECTION).deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) { res.status(404).json({error: "NOT_FOUND"}); return; }
  res.json({success: true});
}));

// Update Entry
exports.updateEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const {id} = req.query;
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }

  const db = await getDb();
  const updateFields = {updatedAt: new Date()};
  if (payload.notes !== undefined) updateFields.notes = payload.notes;
  if (payload.status) updateFields.status = payload.status;

  const result = await db.collection(RECORDS_COLLECTION).findOneAndUpdate(
    {_id: new ObjectId(id)},
    {$set: updateFields},
    {returnDocument: "after"}
  );
  if (!result) { res.status(404).json({error: "NOT_FOUND"}); return; }
  res.json(result);
}));

exports.healthCheck = onRequest(withCors(async (_req, res) => {
  res.json({status: "ok", timestamp: new Date().toISOString()});
}));

exports.login = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const username = payload.usuario || payload.username;
  const password = payload["contraseña"] || payload.password;
  if (!username || !password) {
    res.status(400).json({error: "MISSING_FIELDS", message: "Usuario y contraseña son requeridos"});
    return;
  }

  try {
    const db = await getDb();
    const collection = db.collection(USERS_COLLECTION);
    const userDoc = await collection.findOne({$or: [{usuario: username}, {username}]});

    if (!userDoc) {
      logger.warn("Login attempt failed: user not found", {username});
      res.status(401).json({error: "INVALID_CREDENTIALS", message: "Usuario o contraseña incorrectos"});
      return;
    }

    let isValid = false;
    if (userDoc.passwordHash) {
      isValid = await bcrypt.compare(password, userDoc.passwordHash);
    } else if (typeof userDoc["contraseña"] === "string") {
      isValid = userDoc["contraseña"] === password;
    } else if (typeof userDoc.password === "string") {
      isValid = userDoc.password === password;
    }

    if (!isValid) {
      res.status(401).json({error: "INVALID_CREDENTIALS", message: "Usuario o contraseña incorrectos"});
      return;
    }

    logger.info("Login successful", {username, userId: userDoc._id});
    res.json({user: sanitizeUser(userDoc)});
  } catch (error) {
    logger.error("Login error", {error: error.message, stack: error.stack});
    res.status(500).json({error: "LOGIN_ERROR", message: "Error al procesar el login"});
  }
}));

// Clock In/Out
exports.createEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  if (!employeeId) { res.status(400).json({error: "EMPLOYEE_REQUIRED"}); return; }

  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);
  
  // Usar zona horaria de España
  const now = new Date();
  const spainOffset = 1; // UTC+1 para España (invierno), cambiar a 2 en verano
  const spainTime = new Date(now.getTime() + (spainOffset * 60 * 60 * 1000));

  const doc = {
    employee_id: String(employeeId).trim(),
    date: spainTime.toISOString().slice(0, 10),
    check_in: spainTime,
    check_out: null,
    worked_hours: null,
    status: "incompleto",
    notes: payload.notes || payload.note || "",
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Entry created", {employeeId, entryId: result.insertedId, check_in: spainTime.toISOString()});
  res.status(201).json({id: result.insertedId, ...doc});
}));

exports.completeEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const payload = normalizeBody(req.body);
  const employeeId = payload.employee_id || payload.employeeId || payload.usuario;
  if (!employeeId) { res.status(400).json({error: "EMPLOYEE_REQUIRED"}); return; }

  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);
  const normalizedId = String(employeeId).trim();

  logger.info("completeEntry called", {employeeId, normalizedId});

  // Simplified query - just find by employee_id and status incomplete
  const query = {
    employee_id: normalizedId,
    $or: [
      {status: "incompleto"},
      {check_out: null},
      {check_out: {$exists: false}}
    ]
  };

  logger.info("completeEntry query", {query});

  const existing = await collection.findOne(query, {sort: {check_in: -1}});

  logger.info("completeEntry existing", {existing: existing ? "found" : "not found"});

  if (!existing) {
    // Try a broader search to debug
    const allIncomplete = await collection.find({employee_id: normalizedId}).limit(5).toArray();
    logger.info("completeEntry all records for employee", {count: allIncomplete.length, records: allIncomplete});
    res.status(404).json({error: "ENTRY_NOT_FOUND"}); return;
  }

const endTime = new Date();
  const spainOffset = 1;
  const spainEndTime = new Date(endTime.getTime() + (spainOffset * 60 * 60 * 1000));
  
  // Convertir check_in a España también para el cálculo
  const checkInDate = new Date(existing.check_in);
  const checkInSpain = new Date(checkInDate.getTime() + (spainOffset * 60 * 60 * 1000));
  
  const hours = Math.max(0, (spainEndTime.getTime() - checkInSpain.getTime()) / 3_600_000);
  const workedHours = Math.round(hours * 100) / 100;

  const update = await collection.findOneAndUpdate(
    {_id: existing._id},
    {$set: {check_out: spainEndTime, worked_hours: workedHours, status: "completo", updatedAt: spainEndTime}},
    {returnDocument: "after"},
  );

  if (!update) {
    res.status(404).json({error: "ENTRY_NOT_FOUND_AFTER_UPDATE"});
    return;
  }

  res.json({
    id: update._id,
    employee_id: update.employee_id,
    date: update.date,
    check_in: update.check_in,
    check_out: update.check_out,
    worked_hours: update.worked_hours,
    status: update.status,
    notes: update.notes,
  });
}));

exports.listEntries = onRequest(withCors(async (req, res) => {
  const {employeeId, limit = "20"} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};
  const records = await collection.find(filter).sort({createdAt: -1}).limit(numericLimit).toArray();
  res.json(records.map((record) => ({
    id: record._id, employee_id: record.employee_id, date: record.date, check_in: record.check_in,
    check_out: record.check_out, worked_hours: record.worked_hours, status: record.status, notes: record.notes,
    createdAt: record.createdAt, updatedAt: record.updatedAt,
  })));
}));

exports.getStats = onRequest(withCors(async (_req, res) => {
  const db = await getDb();
  const recordsCollection = db.collection(RECORDS_COLLECTION);
  const usersCollection = db.collection(USERS_COLLECTION);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayFilter = {$or: [{date: today.toISOString().split("T")[0]}, {check_in: {$gte: today, $lt: tomorrow}}]};
  const [allUsers, todayRecords] = await Promise.all([
    usersCollection.countDocuments({}),
    recordsCollection.find({...todayFilter, status: "completo"}).toArray(),
  ]);
  const totalHoursToday = todayRecords.reduce((sum, record) => sum + (record.worked_hours || 0), 0);
  res.json({activeEmployees: allUsers, hoursToday: Math.round(totalHoursToday * 100) / 100});
}));

// ==========================================
// ENDPOINTS - REPORTS (from modules)
// ==========================================

// Witness Reports
exports.createWitnessReport = reports.createWitnessReport;
exports.listWitnessReports = reports.listWitnessReports;
exports.deleteWitnessReport = reports.deleteWitnessReport;

// Visitors Book Reports
exports.createVisitorsBookReport = reports.createVisitorsBookReport;
exports.listVisitorsBookReports = reports.listVisitorsBookReports;
exports.saveVisitorsBookDraft = reports.saveVisitorsBookDraft;
// getPendingVisitorsBookReport definido más abajo
exports.deleteVisitorsBookReport = reports.deleteVisitorsBookReport;
exports.listVisitorsBookDrafts = reports.listVisitorsBookDrafts;

// Reception/Exit Reports
exports.createReceptionExitReport = reports.createReceptionExitReport;
exports.listReceptionExitReports = reports.listReceptionExitReports;
exports.deleteReceptionExitReport = reports.deleteReceptionExitReport;

// Control Agua Reports
exports.createControlAguaDiarioReport = reports.createControlAguaDiarioReport;
exports.listControlAguaDiarioReports = reports.listControlAguaDiarioReports;
exports.deleteControlAguaDiarioReport = reports.deleteControlAguaDiarioReport;

exports.createControlAguaSemanalReport = reports.createControlAguaSemanalReport;
exports.listControlAguaSemanalReports = reports.listControlAguaSemanalReports;
exports.deleteControlAguaSemanalReport = reports.deleteControlAguaSemanalReport;

exports.createControlAguaMensualReport = reports.createControlAguaMensualReport;
exports.listControlAguaMensualReports = reports.listControlAguaMensualReports;
exports.deleteControlAguaMensualReport = reports.deleteControlAguaMensualReport;

exports.createControlAguaTrimestralReport = reports.createControlAguaTrimestralReport;
exports.listControlAguaTrimestralReports = reports.listControlAguaTrimestralReports;
exports.deleteControlAguaTrimestralReport = reports.deleteControlAguaTrimestralReport;

// Control Residues Reports
exports.createControlResiduesReport = reports.createControlResiduesReport;
exports.listControlResiduesReports = reports.listControlResiduesReports;

// Cleaning Reports

exports.createCleaningReport = reports.createCleaningReport;
exports.listCleaningReports = reports.listCleaningReports;
exports.updateCleaningReport = reports.updateCleaningReport;
exports.deleteCleaningReport = reports.deleteCleaningReport;

// Packaging Reports
exports.createPackagingReport = reports.createPackagingReport;
exports.listPackagingReports = reports.listPackagingReports;
exports.updatePackagingReport = reports.updatePackagingReport;
exports.deletePackagingReport = reports.deletePackagingReport;

// Production Reports
exports.createProductionReport = reports.createProductionReport;
exports.listProductionReports = reports.listProductionReports;
exports.deleteProductionReport = reports.deleteProductionReport;

// Weight Reports
exports.createWeightReport = reports.createWeightReport;
exports.saveWeightDraft = reports.saveWeightDraft;
exports.getPendingWeightReport = reports.getPendingWeightReport;
exports.listWeightReports = reports.listWeightReports;
exports.listWeightDrafts = reports.listWeightDrafts;
exports.deleteWeightReport = reports.deleteWeightReport;

// Cleaning Plant Reports
exports.createCleaningPlantReport = reports.createCleaningPlantReport;
exports.listCleaningPlantReports = reports.listCleaningPlantReports;
exports.updateCleaningPlantReport = reports.updateCleaningPlantReport;
exports.deleteCleaningPlantReport = reports.deleteCleaningPlantReport;

// Control Expedition Reports
exports.createControlExpeditionReport = reports.createControlExpeditionReport;
exports.listControlExpeditionReports = reports.listControlExpeditionReports;
exports.updateControlExpeditionReport = reports.updateControlExpeditionReport;
exports.deleteControlExpeditionReport = reports.deleteControlExpeditionReport;

// Customer Satisfaction Reports
exports.createCustomerSatisfactionForm = reports.createCustomerSatisfactionForm;
exports.listCustomerSatisfactionForms = reports.listCustomerSatisfactionForms;
exports.updateCustomerSatisfactionForm = reports.updateCustomerSatisfactionForm;
exports.deleteCustomerSatisfactionForm = reports.deleteCustomerSatisfactionForm;

// Initial Reports
exports.createInitialReport = reports.createInitialReport;
exports.listInitialReports = reports.listInitialReports;
exports.updateInitialReport = reports.updateInitialReport;
exports.deleteInitialReport = reports.deleteInitialReport;

// Tool Registration Reports
exports.createToolReport = reports.createToolReport;
exports.listToolReports = reports.listToolReports;
exports.updateToolReport = reports.updateToolReport;

exports.deleteToolReport = reports.deleteToolReport;

// Revision Reports
exports.createInformeRevision = reports.createInformeRevision;
exports.listInformesRevision = reports.listInformesRevision;
exports.updateInformeRevision = reports.updateInformeRevision;
exports.deleteInformeRevision = reports.deleteInformeRevision;
exports.getInformeRevision = reports.getInformeRevision;
exports.exportInformesRevisionExcel = reports.exportInformesRevisionExcel;



// Control Agua Updates
exports.updateControlAguaDiarioReport = reports.updateControlAguaDiarioReport;
exports.updateControlAguaSemanalReport = reports.updateControlAguaSemanalReport;
exports.updateControlAguaMensualReport = reports.updateControlAguaMensualReport;
exports.updateControlAguaTrimestralReport = reports.updateControlAguaTrimestralReport;

// Control Residues Update
exports.updateControlResiduesReport = reports.updateControlResiduesReport;

// Production Update
exports.updateProductionReport = reports.updateProductionReport;

// Stub functions for missing endpoints (need implementation in modules)
exports.deleteControlResiduesReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const db = await getDb();
  const result = await db.collection("control_residuos").deleteOne({_id: new ObjectId(id)});
  if (result.deletedCount === 0) { res.status(404).json({error: "NOT_FOUND"}); return; }
  res.json({success: true});
}));

exports.updateControlResiduesReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const payload = normalizeBody(req.body);
  const db = await getDb();
  await db.collection("control_residuos").updateOne({_id: new ObjectId(id)}, {$set: {...payload, updatedAt: new Date()}});
  const updated = await db.collection("control_residuos").findOne({_id: new ObjectId(id)});
  res.json(updated);
}));

exports.getPendingVisitorsBookReport = onRequest(withCors(async (req, res) => {
  const {employeeId} = req.query;
  if (!employeeId) { res.status(400).json({error: "EMPLOYEE_REQUIRED"}); return; }
  const db = await getDb();
  const report = await db.collection("libro_visitas").findOne(
    {employee_id: String(employeeId).trim(), completo: false}, 
    {sort: {updatedAt: -1}}
  );
  if (!report) { res.json({pending: false}); return; }
  res.json({pending: true, report: {
    id: report._id,
    fecha: report.fecha,
    horaEntrada: report.horaEntrada,
    horaSalida: report.horaSalida,
    nombreApellidos: report.nombreApellidos,
    dni: report.dni,
    empresa: report.empresa,
    motivoVisita: report.motivoVisita,
    haLeidoNormas: report.haLeidoNormas,
    firmaNombreVisitante: report.firmaInfo?.nombre,
    firmaImagenBase64: null
  }});
}));

exports.updateProductionReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const payload = normalizeBody(req.body);
  const db = await getDb();
  await db.collection(PRODUCTION_REPORTS_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: {...payload, updatedAt: new Date()}});
  const updated = await db.collection(PRODUCTION_REPORTS_COLLECTION).findOne({_id: new ObjectId(id)});
  res.json(updated);
}));

exports.updateWeightReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  const payload = normalizeBody(req.body);
  const db = await getDb();
  await db.collection(WEIGHT_REPORTS_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: {...payload, updatedAt: new Date()}});
  const updated = await db.collection(WEIGHT_REPORTS_COLLECTION).findOne({_id: new ObjectId(id)});
  res.json(updated);
}));

// ==========================================
// ENDPOINTS - WEEKLY SUMMARY
// ==========================================

// Export Weekly Control Summary
exports.exportWeeklyControlSummary = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  try {
    const {weekOffset = 0} = req.query;
    const db = await getDb();
    const offset = parseInt(weekOffset) || 0;
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + (offset * 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const filterByWeek = (report) => {
      if (!report.fecha) return false;
      const date = new Date(`${report.fecha}T00:00:00`);
      return date >= monday && date <= sunday;
    };

    const [initialList, productionList, weightList, witnessList, cleaningList, cleaningPlantList, packagingList, controlExpeditionList] = await Promise.all([
      db.collection(INITIAL_REPORTS_COLLECTION).find({}).limit(1000).toArray(),
      db.collection(PRODUCTION_REPORTS_COLLECTION).find({}).limit(1000).toArray(),
      db.collection(WEIGHT_REPORTS_COLLECTION).find({}).limit(1000).toArray(),
      db.collection("testigos").find({}).limit(1000).toArray(),
      db.collection(CLEANING_REPORTS_COLLECTION).find({}).limit(1000).toArray(),
      db.collection("limpieza_planta").find({}).limit(1000).toArray(),
      db.collection(PACKAGING_REPORTS_COLLECTION).find({}).limit(1000).toArray(),
      db.collection(CONTROL_EXPEDICION_COLLECTION).find({}).limit(1000).toArray(),
    ]);

    const filterWeek = (reports) => reports.filter(filterByWeek);
    const normalizeEnvase = (value) => String(value || "").toUpperCase().replace(/\s+/g, " ").trim();
    const weightTargets = {"165 ML": 165, "200 ML": 200, "2000 ML": 2000, "3600 ML": 3600};
    const isSmallEnvase = (envase) => normalizeEnvase(envase) === "165 ML" || normalizeEnvase(envase) === "200 ML";
    const isLargeEnvase = (envase) => normalizeEnvase(envase) === "2000 ML" || normalizeEnvase(envase) === "3600 ML";

    const buildDeviation = (reports, predicate) => {
      const deviated = reports.filter(predicate);
      return {count: deviated.length, details: deviated.map(r => `${r.fecha || ""} ${r.hora || ""} ${r.employee_id || ""}`.trim())};
    };

    const buildWeightDeviation = (reports, tolerance) => {
      const deviated = reports.filter((report) => {
        const envase = normalizeEnvase(report.envaseCantidad);
        const target = weightTargets[envase];
        const promedio = report.promedio || (report.resumenPesos && report.resumenPesos.promedio);
        if (!target || !promedio) return false;
        return Math.abs(promedio - target) / target > tolerance;
      });
      return {count: deviated.length, details: deviated.map(r => `${r.fecha || ""} ${r.hora || ""} ${r.employee_id || ""}`.trim())};
    };

    const initialWeek = filterWeek(initialList);
    const productionWeek = filterWeek(productionList);
    const weightWeek = filterWeek(weightList);
    const witnessWeek = filterWeek(witnessList);
    const cleaningWeek = filterWeek(cleaningList);
    const cleaningPlantWeek = filterWeek(cleaningPlantList);
    const packagingWeek = filterWeek(packagingList);
    const controlExpeditionWeek = filterWeek(controlExpeditionList);

    const rows = [
      {area: "Control inicial planta", registros: initialWeek.length, desviaciones: buildDeviation(initialWeek, r => r.instalacionesLimpias === "NO" || r.manipuladoresUniformados === "NO" || r.peloProtegido === "NO" || r.unasLimpias === "NO")},
      {area: "PCC2 - pH", registros: productionWeek.length, desviaciones: buildDeviation(productionWeek, r => {
        const noAceptable = [r.color, r.olor, r.sabor, r.textura].some(v => v === "NO_ACEPTABLE");
        const phValue = Number(r.phPcc2);
        return noAceptable || (!Number.isNaN(phValue) && phValue > (r.tipoProducto === "MAYONESA" ? 4.2 : 4.4));
      })},
      {area: "Control de pesos 1,9 kg", registros: weightWeek.filter(r => isLargeEnvase(r.envaseCantidad)).length, desviaciones: buildWeightDeviation(weightWeek.filter(r => isLargeEnvase(r.envaseCantidad)), 0.015)},
      {area: "Control de pesos 165 g", registros: weightWeek.filter(r => isSmallEnvase(r.envaseCantidad)).length, desviaciones: buildWeightDeviation(weightWeek.filter(r => isSmallEnvase(r.envaseCantidad)), 0.045)},
      {area: "Control testigos detector metales", registros: witnessWeek.length, desviaciones: {count: 0, details: []}},
      {area: "Control limpieza", registros: cleaningWeek.length, desviaciones: {count: 0, details: []}},
      {area: "Limpieza planta", registros: cleaningPlantWeek.length, desviaciones: {count: 0, details: []}},
      {area: "Control almacenado palets", registros: controlExpeditionWeek.length, desviaciones: buildDeviation(controlExpeditionWeek, r => r.paletIntegro === "NO" || r.flejadoOK === "NO")},
      {area: "Control envasado", registros: packagingWeek.length, desviaciones: buildDeviation(packagingWeek, r => r.checklist?.paradasEmergencia === "NO" || r.checklist?.etiquetaCorrecta === "NO")},
    ];

    const excelData = rows.map(row => ({
      area: row.area,
      registros: row.registros,
      desviaciones: row.desviaciones.count,
      estado: row.desviaciones.count > 0 ? "NO CONFORME" : "CONFORME",
      detalles: row.desviaciones.details.join("; "),
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet["!cols"] = [{wch: 30}, {wch: 10}, {wch: 12}, {wch: 15}, {wch: 60}];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen_Semanal");

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=resumen_semanal_${monday.toISOString().split("T")[0]}.xlsx`);
    res.send(XLSX.write(workbook, {type: "buffer", bookType: "xlsx"}));
  } catch (error) {
    logger.error("Error in exportWeeklyControlSummary", {error: error.message});
    res.status(500).json({error: "INTERNAL_ERROR"});
  }
}));


