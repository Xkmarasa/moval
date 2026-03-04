/* eslint-disable require-jsdoc */
// Informes de Revisión
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl} = require("../dropbox");
const {REVISION_REPORTS_COLLECTION} = require("../config");
const {ObjectId} = require("mongodb");

exports.createInformeRevision = onRequest({secrets: []}, withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  
  // Required fields
  const {employee_id, fecha, hora, sections, firmaNombreEmpleado, firmaImagenBase64, firmaNombreResponsable, firmaResponsableBase64} = payload;
  
  if (!employee_id || !fecha || !hora || !sections || !firmaNombreEmpleado || !firmaImagenBase64) {
    res.status(400).json({error: "MISSING_FIELDS", message: "Faltan campos requeridos"});
    return;
  }

  const db = await getDb();
  const now = new Date();
  
  let firmaEmpleadoInfo = null;
  let firmaResponsableInfo = null;
  
  try {
    // Upload employee signature
    const empleadoFileName = `revision_${fecha}_${hora}_${employee_id}_empleado.png`;
    const empleadoResult = await uploadFormularioSignatureFromDataUrl(firmaImagenBase64, empleadoFileName, "INFORMES REVISION");
    firmaEmpleadoInfo = {
      nombre: firmaNombreEmpleado,
      url: empleadoResult.path_display,
      uploaded: true
    };
  } catch (e) {
    firmaEmpleadoInfo = {nombre: firmaNombreEmpleado, uploaded: false, error: e.message};
  }

  // Upload responsible signature if provided
  if (firmaResponsableBase64 && firmaNombreResponsable) {
    try {
      const responsableFileName = `revision_${fecha}_${hora}_${employee_id}_responsable.png`;
      const responsableResult = await uploadFormularioSignatureFromDataUrl(firmaResponsableBase64, responsableFileName, "INFORMES REVISION");
      firmaResponsableInfo = {
        nombre: firmaNombreResponsable,
        url: responsableResult.path_display,
        uploaded: true
      };
    } catch (e) {
      firmaResponsableInfo = {nombre: firmaNombreResponsable, uploaded: false, error: e.message};
    }
  }

  // Calculate conformity summary
  let conforme = 0;
  let noConforme = 0;
  let na = 0;
  let total = 0;

  if (sections && Array.isArray(sections)) {
    sections.forEach(section => {
      if (section.points && Array.isArray(section.points)) {
        section.points.forEach(point => {
          if (point.value === 'C') {
            conforme++;
            total++;
          } else if (point.value === 'NC') {
            noConforme++;
            total++;
          } else if (point.value === 'NA') {
            na++;
            total++;
          }
        });
      }
    });
  }

  const doc = {
    employee_id,
    fecha,
    hora,
    sections: sections || [],
    comments: payload.comments || {},
    conformitySummary: {conforme, noConforme, na, total},
    firmaInfo: {
      firmaEmpleado: firmaEmpleadoInfo,
      firmaResponsable: firmaResponsableInfo
    },
    createdAt: now,
    updatedAt: now
  };

  const result = await db.collection(REVISION_REPORTS_COLLECTION).insertOne(doc);
  
  res.status(201).json({
    id: result.insertedId,
    success: true,
    message: "Informe de revisión creado correctamente"
  });
}));

exports.listInformesRevision = onRequest({secrets: []}, withCors(async (req, res) => {
  const db = await getDb();
  
  // Get pagination params
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  // Get total count
  const total = await db.collection(REVISION_REPORTS_COLLECTION).countDocuments({});
  
  // Get paginated reports
  const reports = await db.collection(REVISION_REPORTS_COLLECTION)
    .find({})
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limit)
    .toArray();

  res.json({
    reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

exports.updateInformeRevision = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  const payload = normalizeBody(req.body);
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED"});
    return;
  }

  const db = await getDb();
  
  // Calculate new conformity summary if sections are being updated
  let updateFields = {...payload, updatedAt: new Date()};
  
  if (payload.sections) {
    let conforme = 0;
    let noConforme = 0;
    let na = 0;
    let total = 0;

    payload.sections.forEach(section => {
      if (section.points && Array.isArray(section.points)) {
        section.points.forEach(point => {
          if (point.value === 'C') {
            conforme++;
            total++;
          } else if (point.value === 'NC') {
            noConforme++;
            total++;
          } else if (point.value === 'NA') {
            na++;
            total++;
          }
        });
      }
    });
    
    updateFields.conformitySummary = {conforme, noConforme, na, total};
  }

  await db.collection(REVISION_REPORTS_COLLECTION).updateOne(
    {_id: new ObjectId(id)},
    {$set: updateFields}
  );

  res.json({success: true});
}));

exports.deleteInformeRevision = onRequest(withCors(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED"});
    return;
  }

  const db = await getDb();
  
  const existing = await db.collection(REVISION_REPORTS_COLLECTION).findOne({_id: new ObjectId(id)});
  
  if (!existing) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  // Delete signatures from Dropbox if they exist
  if (existing.firmaInfo) {
    if (existing.firmaInfo.firmaEmpleado && existing.firmaInfo.firmaEmpleado.url) {
      await deleteDropboxFileIfExists(existing.firmaInfo.firmaEmpleado.url);
    }
    if (existing.firmaInfo.firmaResponsable && existing.firmaInfo.firmaResponsable.url) {
      await deleteDropboxFileIfExists(existing.firmaInfo.firmaResponsable.url);
    }
  }

  await db.collection(REVISION_REPORTS_COLLECTION).deleteOne({_id: new ObjectId(id)});
  
  res.json({success: true});
}));

exports.getInformeRevision = onRequest({secrets: []}, withCors(async (req, res) => {
  const {id} = req.query;
  
  if (!id) {
    res.status(400).json({error: "ID_REQUIRED"});
    return;
  }

  const db = await getDb();
  const report = await db.collection(REVISION_REPORTS_COLLECTION).findOne({_id: new ObjectId(id)});
  
  if (!report) {
    res.status(404).json({error: "NOT_FOUND", message: "Informe no encontrado"});
    return;
  }

  res.json(report);
}));
