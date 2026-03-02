/**
 * Índice de zonas de limpieza de planta
 * Exporta todas las zonas con sus checklists organizadas
 */

import { ALMACEN_SECO_CAMARA_GRANDE } from './almacenSecoCamaraGrande.js';
import { ALTILLO } from './altillo.js';
import { CAMARA_REFRIGERADO_PEQUEÑA_ALMACEN } from './camaraRefrigeradoPequenaAlmacen.js';
import { EXTERIORES_RECEPCION_MERCANCIAS } from './exterioresRecepcionMercancias.js';
import { OBRADOR } from './obrador.js';
import { OFFICE } from './office.js';
import { OFICINAS } from './oficinas.js';
import { PASILLOS_PRODUCCION } from './pasillosProduccion.js';
import { SALA_ENCAJADO } from './salaEncajado.js';
import { SALA_MAQUINAS } from './salaMaquinas.js';
import { SALA_PESAJE_LABORATORIO } from './salaPesajeLaboratorio.js';
import { WASH } from './wash.js';

// Re-export individual zones
export { ALMACEN_SECO_CAMARA_GRANDE } from './almacenSecoCamaraGrande.js';
export { ALTILLO } from './altillo.js';
export { CAMARA_REFRIGERADO_PEQUEÑA_ALMACEN } from './camaraRefrigeradoPequenaAlmacen.js';
export { EXTERIORES_RECEPCION_MERCANCIAS } from './exterioresRecepcionMercancias.js';
export { OBRADOR } from './obrador.js';
export { OFFICE } from './office.js';
export { OFICINAS } from './oficinas.js';
export { PASILLOS_PRODUCCION } from './pasillosProduccion.js';
export { SALA_ENCAJADO } from './salaEncajado.js';
export { SALA_MAQUINAS } from './salaMaquinas.js';
export { SALA_PESAJE_LABORATORIO } from './salaPesajeLaboratorio.js';
export { WASH } from './wash.js';

/**
 * Array con todas las zonas de limpieza
 */
export const LIMPIEZA_PLANTA_ZONAS = [
  ALMACEN_SECO_CAMARA_GRANDE,
  ALTILLO,
  CAMARA_REFRIGERADO_PEQUEÑA_ALMACEN,
  EXTERIORES_RECEPCION_MERCANCIAS,
  OBRADOR,
  OFFICE,
  OFICINAS,
  PASILLOS_PRODUCCION,
  SALA_ENCAJADO,
  SALA_MAQUINAS,
  SALA_PESAJE_LABORATORIO,
  WASH
];

/**
 * Periodos disponibles para limpieza
 */
export const LIMPIEZA_PLANTA_PERIODOS = [
  { id: "DIARIO", nombre: "Diario", label: "Diario" },
  { id: "QUINCENAL", nombre: "Quincenal", label: "Quincenal" },
  { id: "SEMANAL", nombre: "Semanal", label: "Semanal" },
  { id: "MENSUAL", nombre: "Mensual", label: "Mensual" },
  { id: "TRIMESTRAL", nombre: "Trimestral", label: "Trimestral" },
  { id: "SEMESTRAL", nombre: "Semestral", label: "Semestral" },
  { id: "ANUAL", nombre: "Anual", label: "Anual" },
  { id: "CADA_5_ANOS", nombre: "Cada 5 años", label: "Cada 5 años" },
];