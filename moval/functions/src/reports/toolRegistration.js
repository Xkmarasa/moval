/* eslint-disable require-jsdoc */
// Registro de Herramientas y Mantenimiento Externo
const {onRequest} = require("firebase-functions/v2/https");
const {withCors, normalizeBody} = require("../utils");
const {getDb} = require("../database");
const {deleteDropboxFileIfExists, uploadToolSignatureFromDataUrl, uploadToolImageFromBuffer} = require("../dropbox");
const {TOOLS_COLLECTION, dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret} = require("../config");
const {ObjectId} = require("mongodb");
const logger = require("firebase-functions/logger");

// Helper para convertir buffer a base64
function bufferToBase64(buffer) {
  if (!buffer) return null;
  if (typeof buffer === "string") return buffer;
  if (buffer.data) {
    // Es un buffer de Firebase Functions
    return Buffer.from(buffer.data).toString("base64");
  }
  return Buffer.from(buffer).toString("base64");
}

// Helper para obtener el campo del body (maneja FormData y JSON)
function getField(body, fieldName) {
  if (!body) return null;
  // Firebase Functions v2 con FormData
  if (body[fieldName] && body[fieldName].data) {
    return Buffer.from(body[fieldName].data).toString("utf8");
  }
  // JSON normal
  return body[fieldName];
}

// Helper para obtener archivo del body (maneja FormData y JSON)
function getFile(body, fieldName) {
  if (!body) return null;
  // Firebase Functions v2 con FormData - el archivo viene como buffer
  if (body[fieldName] && body[fieldName].data) {
    return {
      data: Buffer.from(body[fieldName].data),
      contentType: body[fieldName].contentType || "image/png",
      name: body[fieldName].name || "file",
    };
  }
  // JSON con base64
  if (body[fieldName] && typeof body[fieldName] === "string" && body[fieldName].startsWith("data:")) {
    return body[fieldName];
  }
  return null;
}

exports.createToolReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  
  const payload = normalizeBody(req.body);
  
  // Debug: log the payload keys
  logger.info("ToolRegistration payload received", { 
    keys: Object.keys(payload),
    bodyType: typeof req.body,
    bodyKeys: req.body ? Object.keys(req.body) : 'no body'
  });
  
  // Obtener employee_id de varias fuentes posibles (usando getField para FormData)
  const employeeId = getField(payload, "employee_id") || getField(payload, "employeeId") || getField(payload, "usuario");
  
  // Obtener los campos principales usando getField para manejar FormData correctamente
  const fecha = getField(payload, "fecha");
  const hora = getField(payload, "hora");
  const tipoRegistro = getField(payload, "tipoRegistro");
  
  // Debug: log extracted values
  logger.info("ToolRegistration extracted fields", {
    employeeId,
    fecha,
    hora,
    tipoRegistro
  });
  
  // Validar campos requeridos
  if (!employeeId || !fecha || !hora || !tipoRegistro) {
    logger.error("ToolRegistration missing fields", {
      hasEmployeeId: !!employeeId,
      hasFecha: !!fecha,
      hasHora: !!hora,
      hasTipoRegistro: !!tipoRegistro,
      payloadFields: Object.keys(payload)
    });
    res.status(400).json({error: "MISSING_FIELDS", message: "Faltan campos requeridos: employee_id, fecha, hora, tipoRegistro"});
    return;
  }

  const db = await getDb();
  const now = new Date();
  
  // Obtener tipo de registro y kit usando getField
  const kit = getField(payload, "kit") || null;
  
  logger.info("Procesando Tool Registration", { 
    employeeId, 
    tipoRegistro,
    kit,
    payloadFields: Object.keys(payload)
  });
  
  // Manejar la firma
  let firmaInfo = null;
  const firmaFile = getFile(payload, "firma");
  const firmaBase64 = getField(payload, "firmaImagenBase64");
  
  if (firmaFile) {
    try {
      let base64Data;
      let contentType;
      let fileName;
      
      if (typeof firmaFile === "string") {
        // Ya viene como base64 data URL
        const matches = firmaFile.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          contentType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = firmaFile;
          contentType = "image/png";
        }
      } else {
        // Viene como buffer
        base64Data = bufferToBase64(firmaFile.data);
        contentType = firmaFile.contentType || "image/png";
      }
      
      fileName = `${fecha}_firma_${now.getTime()}.png`;
      
      if (base64Data) {
        // Usar la función específica para Tool Registration
        const result = await uploadToolSignatureFromDataUrl(
          `data:${contentType};base64,${base64Data}`,
          fileName,
          tipoRegistro,
          kit
        );
        firmaInfo = {uploaded: true, name: fileName, dropboxPath: result.path_display, sharedLink: result.sharedLink};
        logger.info("Firma subida correctamente", { dropboxPath: result.path_display });
      }
    } catch (e) {
      logger.error("Error subiendo firma", { error: e.message, stack: e.stack });
      firmaInfo = {uploaded: false, error: e.message};
    }
  } else if (firmaBase64) {
    // Compatibilidad con formato base64 directo
    try {
      const fileName = `${fecha}_firma_${now.getTime()}.png`;
      const result = await uploadToolSignatureFromDataUrl(firmaBase64, fileName, tipoRegistro, kit);
      firmaInfo = {uploaded: true, name: fileName, dropboxPath: result.path_display, sharedLink: result.sharedLink};
      logger.info("Firma base64 subida correctamente", { dropboxPath: result.path_display });
    } catch (e) {
      logger.error("Error subiendo firma base64", { error: e.message });
      firmaInfo = {uploaded: false, error: e.message};
    }
  }

  // Manejar las fotos
  const fotosInfo = [];

  // Procesar el array de fotos que viene del frontend
  if (payload.fotos && Array.isArray(payload.fotos)) {
    for (let i = 0; i < payload.fotos.length; i++) {
      const fotoItem = payload.fotos[i];
      if (fotoItem && typeof fotoItem === "string" && fotoItem.startsWith("data:")) {
        try {
          const fileName = `${fecha}_foto_${i}_${now.getTime()}.jpg`;
          const base64Data = fotoItem.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const result = await uploadToolImageFromBuffer(buffer, fileName, tipoRegistro, kit);
          fotosInfo.push({uploaded: true, name: fileName, dropboxPath: result.path_display, sharedLink: result.sharedLink});
          logger.info(`Foto array ${i} subida correctamente`, { dropboxPath: result.path_display });
        } catch (e) {
          logger.error(`Error subiendo foto array ${i}`, { error: e.message });
        }
      }
    }
  }
  
  // También procesar arrays de fotos si vienen así (compatibilidad)
  if (payload.fotosArray && Array.isArray(payload.fotosArray)) {
    for (let i = 0; i < payload.fotosArray.length; i++) {
      const fotoItem = payload.fotosArray[i];
      if (fotoItem && typeof fotoItem === "string" && fotoItem.startsWith("data:")) {
        try {
          const fileName = `${fecha}_foto_${i}_${now.getTime()}.jpg`;
          const base64Data = fotoItem.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const result = await uploadToolImageFromBuffer(buffer, fileName, tipoRegistro, kit);
          fotosInfo.push({uploaded: true, name: fileName, dropboxPath: result.path_display, sharedLink: result.sharedLink});
          logger.info(`Foto array ${i} subida correctamente`, { dropboxPath: result.path_display });
        } catch (e) {
          logger.error(`Error subiendo foto array ${i}`, { error: e.message });
        }
      }
    }
  }

  // Procesar fotos individuales (foto1, foto2, etc.) - para compatibilidad
  const fotoFields = ["fotos", "foto1", "foto2", "foto3", "foto4", "foto5"];
  
  for (const field of fotoFields) {
    const fotoFile = getFile(payload, field);
    if (fotoFile) {
      try {
        let base64Data;
        let contentType;
        let fileName;

        if (typeof fotoFile === "string") {
          const matches = fotoFile.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            contentType = matches[1];
            base64Data = matches[2];
          } else {
            base64Data = fotoFile;
            contentType = "image/jpeg";
          }
        } else {
          base64Data = bufferToBase64(fotoFile.data);
          contentType = fotoFile.contentType || "image/jpeg";
        }

        fileName = `${fecha}_${field}_${now.getTime()}.jpg`;

        if (base64Data) {
          const buffer = Buffer.from(base64Data, "base64");
          // Usar la función específica para imágenes de Tool Registration
          const result = await uploadToolImageFromBuffer(buffer, fileName, tipoRegistro, kit);
          fotosInfo.push({uploaded: true, name: fileName, dropboxPath: result.path_display, sharedLink: result.sharedLink});
          logger.info(`Foto ${field} subida correctamente`, { dropboxPath: result.path_display });
        }
      } catch (e) {
        logger.error(`Error subiendo foto ${field}`, { error: e.message });
        fotosInfo.push({uploaded: false, field: field, error: e.message});
      }
    }
  }

  // Obtener los demás campos usando getField para manejar FormData correctamente
  const empresaTecnico = getField(payload, "empresaTecnico") || "";
  const checklistEntrada = getField(payload, "checklistEntrada") || "";
  const checklistSalida = getField(payload, "checklistSalida") || "";
  const noConformidad = getField(payload, "noConformidad") || "";
  const firmaNombreEmpleado = getField(payload, "firmaNombreEmpleado") || "";

  // Crear el documento del informe
  const doc = {
    employee_id: String(employeeId).trim(),
    fecha: fecha,
    hora: hora,
    tipoRegistro: tipoRegistro,
    tipoInforme: "REGISTRO_HERRAMIENTAS",
    empresaTecnico: empresaTecnico,
    kit: kit,
    checklistEntrada: checklistEntrada,
    checklistSalida: checklistSalida,
    noConformidad: noConformidad,
    firmaNombreEmpleado: firmaNombreEmpleado,
    firmaInfo,
    fotos: fotosInfo,
    createdAt: now,
    updatedAt: now,
  };

  logger.info("Creando informe de herramientas", { 
    employeeId, 
    tipoRegistro,
    kit,
    fotosCount: fotosInfo.length,
    firmaUploaded: firmaInfo?.uploaded
  });

  const result = await db.collection(TOOLS_COLLECTION).insertOne(doc);
  res.status(201).json({id: result.insertedId, success: true});
}));

exports.listToolReports = onRequest({secrets: []}, withCors(async (req, res) => {
  const {limit = "200", tipoRegistro, kit} = req.query;
  const db = await getDb();
  
  const filter = {};
  if (tipoRegistro) filter.tipoRegistro = tipoRegistro;
  if (kit) filter.kit = kit;
  
  const reports = await db.collection(TOOLS_COLLECTION)
    .find(filter)
    .sort({createdAt: -1})
    .limit(parseInt(limit) || 200)
    .toArray();
    
  res.json(reports);
}));

exports.updateToolReport = onRequest(withCors(async (req, res) => {
  if (req.method !== "PUT" && req.method !== "PATCH") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const payload = normalizeBody(req.body);
  if (!id) { res.status(400).json({error: "ID_REQUIRED"}); return; }
  
  const db = await getDb();
  const updateFields = {updatedAt: new Date()};
  
  // Actualizar solo los campos que vienen en el payload
  const allowedFields = ["fecha", "hora", "tipoRegistro", "empresaTecnico", "kit", "checklistEntrada", "checklistSalida", "noConformidad", "firmaNombreEmpleado"];
  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      updateFields[field] = payload[field];
    }
  }
  
  await db.collection(TOOLS_COLLECTION).updateOne({_id: new ObjectId(id)}, {$set: updateFields});
  res.json({success: true});
}));

exports.deleteToolReport = onRequest({secrets: [dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret]}, withCors(async (req, res) => {
  if (req.method !== "DELETE") { res.status(405).json({error: "METHOD_NOT_ALLOWED"}); return; }
  const {id} = req.query;
  const db = await getDb();
  
  const existing = await db.collection(TOOLS_COLLECTION).findOne({_id: new ObjectId(id)});
  
  // Eliminar firma de Dropbox
  if (existing?.firmaInfo?.dropboxPath) {
    await deleteDropboxFileIfExists(existing.firmaInfo.dropboxPath);
  }
  
  // Eliminar fotos de Dropbox
  if (existing?.fotos && Array.isArray(existing.fotos)) {
    for (const foto of existing.fotos) {
      if (foto.dropboxPath) {
        await deleteDropboxFileIfExists(foto.dropboxPath);
      }
    }
  }
  
  await db.collection(TOOLS_COLLECTION).deleteOne({_id: new ObjectId(id)});
  res.json({success: true});
}));

