/* eslint-disable require-jsdoc */
// Configuración de la aplicación Firebase Functions

const {setGlobalOptions} = require("firebase-functions/v2");
const {defineSecret} = require("firebase-functions/params");

// Definir los secrets de Dropbox
const dropboxToken = defineSecret("DROPBOX_ACCESS_TOKEN");
const dropboxRefreshToken = defineSecret("DROPBOX_REFRESH_TOKEN");
const dropboxAppKey = defineSecret("DROPBOX_APP_KEY");
const dropboxAppSecret = defineSecret("DROPBOX_APP_SECRET");

// Configuración global de Firebase Functions
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
  memory: "512MiB",
  timeoutSeconds: 540, // 9 minutos para permitir subida de fotos a Dropbox
});

// Constantes de colecciones MongoDB
const {
  MONGODB_URI = "mongodb+srv://Xavi:Xavi2712@moval.vfm7zzp.mongodb.net/",
  MONGODB_DB = "moval",
  RECORDS_COLLECTION = "registros",
  USERS_COLLECTION = "usuarios",
  REPORTS_COLLECTION = "informes",
  TOOLS_COLLECTION = "herramientas",
  INITIAL_REPORTS_COLLECTION = "inicial",
  PACKAGING_REPORTS_COLLECTION = "envasado",
  PRODUCTION_REPORTS_COLLECTION = "produccion",
  WEIGHT_REPORTS_COLLECTION = "peso_producto",
  CLEANING_REPORTS_COLLECTION = "limpieza",
  CLEANING_PLANT_REPORTS_COLLECTION = "limpieza_planta",
  WITNESS_REPORTS_COLLECTION = "testigos",
  VISITORS_BOOK_COLLECTION = "libro_visitas",
  RECEPTION_EXIT_COLLECTION = "recepcion_salida_mercancia",
  CONTROL_RESIDUES_COLLECTION = "control_residuos",
  CONTROL_EXPEDICION_COLLECTION = "control_expedicion",
  CONTROL_AGUA_DIARIO_COLLECTION = "control_agua_diario",
  CONTROL_AGUA_SEMANAL_COLLECTION = "control_agua_semanal",
  CONTROL_AGUA_MENSUAL_COLLECTION = "control_agua_mensual",
  CONTROL_AGUA_TRIMESTRAL_COLLECTION = "control_agua_trimestral",
  SATISFACTION_FORMS_COLLECTION = "satisfaccion_clientes",
  REVISION_REPORTS_COLLECTION = "informe_revision",
  ALLOWED_ORIGINS = "*",
  ADMIN_SETUP_TOKEN = "",
} = process.env;

module.exports = {
  dropboxToken,
  dropboxRefreshToken,
  dropboxAppKey,
  dropboxAppSecret,
  MONGODB_URI,
  MONGODB_DB,
  RECORDS_COLLECTION,
  USERS_COLLECTION,
  REPORTS_COLLECTION,
  TOOLS_COLLECTION,
  INITIAL_REPORTS_COLLECTION,
  PACKAGING_REPORTS_COLLECTION,
  PRODUCTION_REPORTS_COLLECTION,
  WEIGHT_REPORTS_COLLECTION,
  CLEANING_REPORTS_COLLECTION,
  CLEANING_PLANT_REPORTS_COLLECTION,
  WITNESS_REPORTS_COLLECTION,
  VISITORS_BOOK_COLLECTION,
  RECEPTION_EXIT_COLLECTION,
  CONTROL_RESIDUES_COLLECTION,
  CONTROL_EXPEDICION_COLLECTION,
  CONTROL_AGUA_DIARIO_COLLECTION,
  CONTROL_AGUA_SEMANAL_COLLECTION,
  CONTROL_AGUA_MENSUAL_COLLECTION,
  CONTROL_AGUA_TRIMESTRAL_COLLECTION,
  SATISFACTION_FORMS_COLLECTION,
  REVISION_REPORTS_COLLECTION,
  ALLOWED_ORIGINS,
  ADMIN_SETUP_TOKEN,
};

