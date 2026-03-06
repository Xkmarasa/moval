/* eslint-disable require-jsdoc */
// Módulo de utilidades para Dropbox

const {dropboxToken, dropboxRefreshToken, dropboxAppKey, dropboxAppSecret} = require("./config");
const logger = require("firebase-functions/logger");

let cachedDropboxAccessToken = null;
let cachedDropboxExpiresAt = 0;

// Obtiene un token de Dropbox válido
async function getDropboxAccessToken(forceRefresh = false) {
  const now = Date.now();

  // Reutilizar token en caché si aún no ha caducado y no forzamos refresh
  if (!forceRefresh && cachedDropboxAccessToken && now < cachedDropboxExpiresAt - 60_000) {
    return cachedDropboxAccessToken;
  }

  const refresh = dropboxRefreshToken.value && dropboxRefreshToken.value();
  const appKey = dropboxAppKey.value && dropboxAppKey.value();
  const appSecret = dropboxAppSecret.value && dropboxAppSecret.value();

  // Si no tenemos datos para refresh, usar el token fijo
  if (!refresh || !appKey || !appSecret) {
    const token = dropboxToken.value && dropboxToken.value();
    if (!token) {
      logger.warn("DROPBOX_ACCESS_TOKEN no configurado");
      throw new Error("DROPBOX_ACCESS_TOKEN no configurado");
    }
    cachedDropboxAccessToken = token;
    cachedDropboxExpiresAt = now + 30 * 24 * 60 * 60 * 1000;
    return token;
  }

  // Renovar token usando refresh_token
  logger.info("Refrescando token de Dropbox usando refresh_token");
  const basicAuth = Buffer.from(`${appKey}:${appSecret}`).toString("base64");

  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refresh)}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Error al refrescar el token de Dropbox", {
      status: response.status,
      errorText,
    });
    throw new Error("No se pudo refrescar el token de Dropbox");
  }

  const data = await response.json();
  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 14_400;

  cachedDropboxAccessToken = accessToken;
  cachedDropboxExpiresAt = Date.now() + (expiresIn - 60) * 1000;

  logger.info("Token de Dropbox refrescado correctamente", {expiresIn});

  return accessToken;
}

// Elimina un archivo de Dropbox si existe
async function deleteDropboxFileIfExists(dropboxPath, context = {}) {
  if (!dropboxPath) {
    return {deleted: false, skipped: true};
  }

  try {
    const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
    const response = await fetch("https://api.dropboxapi.com/2/files/delete_v2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({path: dropboxPath}),
    });

    if (response.ok) {
      const result = await response.json();
      logger.info("Archivo eliminado de Dropbox", {dropboxPath, ...context});
      return {deleted: true, result};
    }

    const errorText = await response.text();
    let errorSummary = "";
    try {
      const errorJson = JSON.parse(errorText);
      errorSummary = errorJson.error_summary || "";
    } catch (e) {
      // ignore parse error
    }

    if (errorSummary.includes("path/not_found")) {
      logger.warn("Archivo no encontrado en Dropbox", {dropboxPath, ...context});
      return {deleted: false, notFound: true};
    }

    logger.error("Error al eliminar archivo en Dropbox", {
      dropboxPath,
      errorText,
      errorSummary,
      ...context,
    });
    return {deleted: false, error: errorSummary || errorText};
  } catch (error) {
    logger.error("Error en deleteDropboxFileIfExists", {
      dropboxPath,
      error: error.message,
      stack: error.stack,
      ...context,
    });
    return {deleted: false, error: error.message};
  }
}

// Sube un archivo a Dropbox
async function uploadToDropbox(fileBuffer, fileName, folderName) {
  const BASE_PATH = "/SISTEMAS 2021/MOVAL FOODS/3. RRPP Y APPCC/6. MANTENIMIENTO Y EQUIPOS DE MEDICION/REGISTRO CONTROL DE HERRAMIENTAS";
  const BASE_PATH_HERRAMIENTAS = `${BASE_PATH}/HERRAMIENTAS DE ENVASADORAS`;
  const BASE_PATH_MANTENIMIENTO = `${BASE_PATH}/MANTENIMIENTO EXTERNO`;

  let dropboxPath;

  if (folderName === "FIRMAS_HERRAMIENTAS_ENVASADORAS") {
    dropboxPath = `${BASE_PATH_HERRAMIENTAS}/FIRMAS/${fileName}`;
  } else if (folderName === "FIRMAS_MANTENIMIENTO_EXTERNO") {
    dropboxPath = `${BASE_PATH_MANTENIMIENTO}/FIRMAS/${fileName}`;
  } else if (folderName === "FIRMAS") {
    dropboxPath = `${BASE_PATH}/FIRMAS/${fileName}`;
  } else if (folderName === "MANTENIMIENTO EXTERNO") {
    dropboxPath = `${BASE_PATH_MANTENIMIENTO}/${fileName}`;
  } else {
    const folderMap = {
      "CAJA COMUN": "CAJA COMUN",
      "ENVASADORA 2000 ML": "ENVASADORA 2000 ML",
      "ENVASADORA 3600": "ENVASADORA 3600",
      "ENVASADORA TARRINAS": "ENVASADORA TARRINAS",
    };
    const folderPath = folderMap[folderName] || "";
    dropboxPath = `${BASE_PATH_HERRAMIENTAS}/${folderPath}/${fileName}`;
  }

  logger.info("Subiendo archivo a Dropbox", {folderName, dropboxPath, fileName});

  try {
    const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: dropboxPath,
          mode: "add",
          autorename: true,
          mute: false,
        }),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Error al subir a Dropbox (${response.status}): ${errorText}`;
      let isExpiredToken = false;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error_summary) {
          errorMessage = `Error al subir a Dropbox: ${errorJson.error_summary}`;
          if (typeof errorJson.error_summary === "string" &&
              errorJson.error_summary.includes("expired_access_token")) {
            isExpiredToken = true;
          }
        }
      } catch (e) {
        // ignore
      }

      if (isExpiredToken) {
        logger.warn("Token de Dropbox caducado. Forzando refresh y reintentando...");
        try {
          const refreshedToken = await getDropboxAccessToken(true);
          const retryResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${refreshedToken}`,
              "Content-Type": "application/octet-stream",
              "Dropbox-API-Arg": JSON.stringify({
                path: dropboxPath,
                mode: "add",
                autorename: true,
                mute: false,
              }),
            },
            body: fileBuffer,
          });

          if (retryResponse.ok) {
            const retryResult = await retryResponse.json();
            logger.info("Archivo subido correctamente tras refrescar token", {
              fileName,
              dropboxPath: retryResult.path_display || dropboxPath,
            });
            return retryResult;
          }
        } catch (retryError) {
          logger.error("Fallo al refrescar token y reintentar", {error: retryError.message});
        }
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    logger.info("Archivo subido exitosamente a Dropbox", {
      fileName,
      dropboxPath: result.path_display || dropboxPath,
    });
    return result;
  } catch (error) {
    logger.error("Error en uploadToDropbox", {
      error: error.message,
      stack: error.stack,
      fileName,
      dropboxPath,
    });
    throw error;
  }
}

// Sube una firma de formulario a Dropbox
async function uploadFormularioSignatureFromDataUrl(dataUrl, fileName, formularioFolder) {
  const BASE_PATH_FORMULARIOS = "/SISTEMAS 2021/MOVAL FOODS/FORMULARIOS";
  const dropboxPath = `${BASE_PATH_FORMULARIOS}/${formularioFolder}/FIRMAS/${fileName}`;

  const base64Part = (dataUrl || "").split(",")[1];
  if (!base64Part) {
    throw new Error("Firma en formato base64 inválido");
  }

  const fileBuffer = Buffer.from(base64Part, "base64");

  logger.info("Subiendo firma de formulario a Dropbox", {formularioFolder, dropboxPath, fileName});

  try {
    const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: dropboxPath,
          mode: "add",
          autorename: true,
          mute: false,
        }),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Error subiendo firma a Dropbox", {status: response.status, errorText});
      throw new Error("No se pudo subir la firma a Dropbox");
    }

    const result = await response.json();
    const resultPath = result.path_display || dropboxPath;

    let sharedLink = "";
    try {
      sharedLink = await createDropboxSharedLink(resultPath);
    } catch (linkError) {
      logger.warn("No se pudo crear enlace compartido", {error: linkError.message});
      sharedLink = `https://www.dropbox.com/home${encodeURI(resultPath)}`;
    }

    logger.info("Firma subida correctamente a Dropbox", {fileName, dropboxPath: resultPath});
    return {...result, sharedLink};
  } catch (error) {
    logger.error("Error en uploadFormularioSignatureFromDataUrl", {
      error: error.message,
      stack: error.stack,
      fileName,
      dropboxPath,
    });
    throw error;
  }
}

// Crea un enlace compartido para un archivo
async function createDropboxSharedLink(dropboxPath) {
  const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
  try {
    const shareResponse = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: dropboxPath,
        settings: {
          requested_visibility: "public",
          audience: "public",
          access: "viewer",
        },
      }),
    });

    if (shareResponse.ok) {
      const shareResult = await shareResponse.json();
      return shareResult.url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
    }

    const errorText = await shareResponse.text();
    logger.warn("No se pudo crear enlace compartido", {status: shareResponse.status, errorText, dropboxPath});

    // Intentar con list_shared_links si falla
    if (shareResponse.status === 403 || errorText.includes("not permitted") || errorText.includes("scope") || errorText.includes("shared_link_already_exists")) {
      try {
        const listResponse = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({path: dropboxPath, direct_only: true}),
        });
        if (listResponse.ok) {
          const listResult = await listResponse.json();
          if (listResult.links && listResult.links.length > 0) {
            return listResult.links[0].url
              .replace("www.dropbox.com", "dl.dropboxusercontent.com")
              .replace("?dl=0", "");
          }
        }
      } catch (listError) {
        logger.warn("Error obteniendo enlace compartido existente", {error: listError.message, dropboxPath});
      }
    }
    
    // Lanzar error para que el caller use el fallback
    throw new Error(`No se pudo crear sharedLink para ${dropboxPath}: ${errorText}`);
  } catch (error) {
    logger.warn("Error creando enlace compartido", {error: error.message, dropboxPath});
    throw error; // Re-lanzar para que el caller use el fallback
  }
}

// Asegura que un archivo tenga un enlace compartido
async function ensureSharedLink(collection, reportId, firmaInfo, fieldName = "firmaInfo") {
  if (!firmaInfo || !firmaInfo.dropboxPath) {
    return firmaInfo;
  }
  
  // Si ya tiene sharedLink, retornarlo
  if (firmaInfo.sharedLink) {
    return firmaInfo;
  }
  
  // Intentar crear el sharedLink
  let sharedLink = "";
  try {
    sharedLink = await createDropboxSharedLink(firmaInfo.dropboxPath);
  } catch (error) {
    logger.warn("Error en ensureSharedLink creando sharedLink", {error: error.message, dropboxPath: firmaInfo.dropboxPath});
    // Usar fallback
    sharedLink = `https://www.dropbox.com/home${encodeURI(firmaInfo.dropboxPath)}`;
  }
  
  if (!sharedLink) {
    // Fallback final
    sharedLink = `https://www.dropbox.com/home${encodeURI(firmaInfo.dropboxPath)}`;
  }

  // Actualizar en la base de datos
  await collection.updateOne(
    {_id: reportId},
    {$set: {[fieldName + ".sharedLink"]: sharedLink, updatedAt: new Date()}}
  );

  return {...firmaInfo, sharedLink};
}

// Sube una firma de Tool Registration a Dropbox (ruta específica para herramientas)
async function uploadToolSignatureFromDataUrl(dataUrl, fileName, tipoRegistro, kit = null) {
  const BASE_PATH = "/SISTEMAS 2021/MOVAL FOODS/3. RRPP Y APPCC/6. MANTENIMIENTO Y EQUIPOS DE MEDICION/REGISTRO CONTROL DE HERRAMIENTAS";
  
  // Determinar la subcarpeta según el tipo de registro
  let subFolder;
  if (tipoRegistro === "MANTENIMIENTO_EXTERNO") {
    subFolder = "MANTENIMIENTO EXTERNO";
  } else {
    subFolder = "HERRAMIENTAS DE ENVASADORA";
  }
  
  const dropboxPath = `${BASE_PATH}/${subFolder}/FIRMAS/${fileName}`;

  const base64Part = (dataUrl || "").split(",")[1];
  if (!base64Part) {
    throw new Error("Firma en formato base64 inválido");
  }

  const fileBuffer = Buffer.from(base64Part, "base64");

  logger.info("Subiendo firma de Tool Registration a Dropbox", {tipoRegistro, kit, dropboxPath, fileName});

  try {
    const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: dropboxPath,
          mode: "add",
          autorename: true,
          mute: false,
        }),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Error subiendo firma de Tool Registration a Dropbox", {status: response.status, errorText});
      throw new Error("No se pudo subir la firma a Dropbox");
    }

    const result = await response.json();
    const resultPath = result.path_display || dropboxPath;

    let sharedLink = "";
    try {
      sharedLink = await createDropboxSharedLink(resultPath);
    } catch (linkError) {
      logger.warn("No se pudo crear enlace compartido para firma", {error: linkError.message});
      sharedLink = `https://www.dropbox.com/home${encodeURI(resultPath)}`;
    }

    logger.info("Firma de Tool Registration subida correctamente a Dropbox", {fileName, dropboxPath: resultPath});
    return {...result, sharedLink};
  } catch (error) {
    logger.error("Error en uploadToolSignatureFromDataUrl", {
      error: error.message,
      stack: error.stack,
      fileName,
      dropboxPath,
    });
    throw error;
  }
}

// Sube una imagen de Tool Registration a Dropbox (ruta específica para herramientas)
async function uploadToolImageFromBuffer(buffer, fileName, tipoRegistro, kit = null) {
  const BASE_PATH = "/SISTEMAS 2021/MOVAL FOODS/3. RRPP Y APPCC/6. MANTENIMIENTO Y EQUIPOS DE MEDICION/REGISTRO CONTROL DE HERRAMIENTAS";
  
  let dropboxPath;
  
  if (tipoRegistro === "MANTENIMIENTO_EXTERNO") {
    // Para mantenimiento externo, las fotos van directamente en la carpeta
    dropboxPath = `${BASE_PATH}/MANTENIMIENTO EXTERNO/${fileName}`;
  } else {
    // Para herramientas envasadoras, las fotos van en la subcarpeta del kit
    // Mapear el valor del kit al nombre de carpeta
    const kitFolderMap = {
      "KIT_1_ENVASADORA_3.6_KG": "ENVASADORA 3600",
      "KIT_2_ENVASADORA_2_KG": "ENVASADORA 2000 ML",
      "KIT_3_ENVASADORA_TARRINAS": "ENVASADORA TARRINAS",
      "KIT_4_CAJA_COMUN": "CAJA COMUN",
    };
    const kitFolder = kitFolderMap[kit] || "HERRAMIENTAS DE ENVASADORAS";
    dropboxPath = `${BASE_PATH}/HERRAMIENTAS DE ENVASADORAS/${kitFolder}/${fileName}`;
  }

  logger.info("Subiendo imagen de Tool Registration a Dropbox", {tipoRegistro, kit, dropboxPath, fileName});

  try {
    const DROPBOX_ACCESS_TOKEN = await getDropboxAccessToken();
    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: dropboxPath,
          mode: "add",
          autorename: true,
          mute: false,
        }),
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Error subiendo imagen de Tool Registration a Dropbox", {status: response.status, errorText});
      throw new Error("No se pudo subir la imagen a Dropbox");
    }

    const result = await response.json();
    const resultPath = result.path_display || dropboxPath;

    let sharedLink = "";
    try {
      sharedLink = await createDropboxSharedLink(resultPath);
    } catch (linkError) {
      logger.warn("No se pudo crear enlace compartido para imagen", {error: linkError.message});
      sharedLink = `https://www.dropbox.com/home${encodeURI(resultPath)}`;
    }

    logger.info("Imagen de Tool Registration subida correctamente a Dropbox", {fileName, dropboxPath: resultPath});
    return {...result, sharedLink};
  } catch (error) {
    logger.error("Error en uploadToolImageFromBuffer", {
      error: error.message,
      stack: error.stack,
      fileName,
      dropboxPath,
    });
    throw error;
  }
}

module.exports = {
  getDropboxAccessToken,
  deleteDropboxFileIfExists,
  uploadToDropbox,
  uploadFormularioSignatureFromDataUrl,
  createDropboxSharedLink,
  ensureSharedLink,
  uploadToolSignatureFromDataUrl,
  uploadToolImageFromBuffer,
};

