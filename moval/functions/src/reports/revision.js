/* eslint-disable require-jsdoc */
// Informes de Revisión
const {onRequest} = require("firebase-functions/v2/https");
const XLSX = require("xlsx");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadFormularioSignatureFromDataUrl} = require("../dropbox");
const {REVISION_REPORTS_COLLECTION, dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret} = require("../config");
const {ObjectId} = require("mongodb");

exports.createInformeRevision = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).json({error: "METHOD_NOT_ALLOWED"});
      return;
    }

    const payload = normalizeBody(req.body);
    
    // Required fields
    const {employee_id, fecha, hora, sections, firmaNombreResponsable, firmaResponsableBase64} = payload;
    
    // Make employee signature optional - only require employee_id, fecha, hora, and sections
    if (!employee_id || !fecha || !hora || !sections) {
      res.status(400).json({error: "MISSING_FIELDS", message: "Faltan campos requeridos"});
      return;
    }

    const db = await getDb();
    const now = new Date();
    
    let firmaEmpleadoInfo = null;
    let firmaResponsableInfo = null;
    
    // Upload employee signature only if provided
    const firmaNombreEmpleado = payload.firmaNombreEmpleado;
    const firmaImagenBase64 = payload.firmaImagenBase64;
    
    if (firmaImagenBase64 && firmaNombreEmpleado) {
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
  } catch (error) {
    console.error("Error in createInformeRevision:", error);
    res.status(500).json({error: "INTERNAL_ERROR", message: error.message});
  }
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

exports.updateInformeRevision = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
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

exports.deleteInformeRevision = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
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

// Export Informes Revision to Excel
exports.exportInformesRevisionExcel = onRequest({secrets: []}, withCors(async (req, res) => {
  try {
    const db = await getDb();
    
    // Get filter params
    const { startDate, endDate } = req.query;
    
    // Build query filter
    const filter = {};
    if (startDate || endDate) {
      filter.fecha = {};
      if (startDate) filter.fecha.$gte = startDate;
      if (endDate) filter.fecha.$lte = endDate;
    }
    
    // Get all reports (no pagination for export)
    const reports = await db.collection(REVISION_REPORTS_COLLECTION)
      .find(filter)
      .sort({fecha: -1, hora: -1})
      .toArray();

    // Transform data for Excel
    const excelData = reports.map(report => {
      // Calculate conformity status
      const summary = report.conformitySummary || {conforme: 0, noConforme: 0, na: 0, total: 0};
      const conformidad = summary.noConforme > 0 ? "NO CONFORME" : "CONFORME";
      
      // Get areas/sections list
      const areas = Array.isArray(report.sections) 
        ? report.sections.map(s => s.title).join("; ")
        : "";
      
      // Count points by status
      let puntosRevisados = 0;
      let puntosConformes = 0;
      let puntosNoConformes = 0;
      let puntosNoAplica = 0;
      
      if (Array.isArray(report.sections)) {
        report.sections.forEach(section => {
          if (section.points && Array.isArray(section.points)) {
            section.points.forEach(point => {
              puntosRevisados++;
              if (point.value === 'C' || point.status === 'C') {
                puntosConformes++;
              } else if (point.value === 'NC' || point.status === 'NC') {
                puntosNoConformes++;
              } else if (point.value === 'NA' || point.status === 'NA') {
                puntosNoAplica++;
              }
            });
          }
        });
      }
      
      // Get comments as string
      let comentarios = "";
      if (Array.isArray(report.sections)) {
        const commentsList = [];
        report.sections.forEach(section => {
          if (section.points && Array.isArray(section.points)) {
            section.points.forEach(point => {
              const comment = point.comments || point.comment;
              if (comment) {
                commentsList.push(`${point.label || point.id}: ${comment}`);
              }
            });
          }
        });
        comentarios = commentsList.join(" | ");
      }
      
      // Get signature URLs
      const firmaEmpleadoUrl = report.firmaInfo?.firmaEmpleado?.url || "";
      const firmaResponsableUrl = report.firmaInfo?.firmaResponsable?.url || "";
      const nombreEmpleado = report.firmaInfo?.firmaEmpleado?.nombre || "";
      const nombreResponsable = report.firmaInfo?.firmaResponsable?.nombre || "";
      
      return {
        "Fecha": report.fecha || "",
        "Hora": report.hora || "",
        "Empleado": report.employee_id || "",
        "Nombre Empleado": nombreEmpleado,
        "Nombre Responsable": nombreResponsable,
        "Áreas": areas,
        "Puntos Revisados": puntosRevisados,
        "Conformes": puntosConformes,
        "No Conformes": puntosNoConformes,
        "No Aplica": puntosNoAplica,
        "Conformidad": conformidad,
        "Comentarios": comentarios,
        "Firma Empleado URL": firmaEmpleadoUrl,
        "Firma Responsable URL": firmaResponsableUrl,
        "Fecha Creación": report.createdAt ? new Date(report.createdAt).toLocaleString("es-ES") : "",
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    worksheet["!cols"] = [
      {wch: 12},  // Fecha
      {wch: 8},   // Hora
      {wch: 20},  // Empleado
      {wch: 25},  // Nombre Empleado
      {wch: 25},  // Nombre Responsable
      {wch: 50},  // Áreas
      {wch: 15},  // Puntos Revisados
      {wch: 12},  // Conformes
      {wch: 15},  // No Conformes
      {wch: 12},  // No Aplica
      {wch: 15},  // Conformidad
      {wch: 80},  // Comentarios
      {wch: 60},  // Firma Empleado URL
      {wch: 60},  // Firma Responsable URL
      {wch: 20},  // Fecha Creación
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Informes_Revision");
    
    // Set response headers for file download
    const filename = `informes_revision_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    
    // Send Excel file
    res.send(XLSX.write(workbook, {type: "buffer", bookType: "xlsx"}));
  } catch (error) {
    console.error("Error exporting Informes Revision to Excel:", error);
    res.status(500).json({error: "EXPORT_ERROR", message: error.message});
  }
}));
