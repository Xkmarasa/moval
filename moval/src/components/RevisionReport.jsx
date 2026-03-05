import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";
import { resizeSignatureCanvas, clearSignatureCanvas } from "../utils/signatureCanvas";

// Definición de secciones y puntos de verificación
const REVISION_SECTIONS = [
  {
    id: "verificacion_limpieza",
    title: "VERIFICACIÓN SISTEMA LIMPIEZA (documental y operativa)",
    points: [
      { id: "erp_analisis_inicial", label: "ERP: registro de 'análisis inicial' diario disponible y cumplimentado (preoperacional)", criterio: "Registro disponible y cumplimentado" },
      { id: "erp_analisis_limpieza", label: "ERP: registro de 'análisis de limpieza' disponible (incluye Biuret en premix, depósitos y tolvas)", criterio: "Registro disponible" },
      { id: "plan_analiticas", label: "Plan de analíticas de superficie (PG03.2-2): 1/mes realizado; informe revisado y archivado (Microal)", criterio: "Informe revisado y archivado" },
      { id: "gestion_desviaciones", label: "Gestión de desviaciones: si hubo NC de higiene, existe registro NC en ERP (PG06) y cierre documentado", criterio: "Registro NC y cierre documentado" },
      { id: "almacen_quimicos", label: "Almacén de químicos: cerrado con llave; productos identificados; FT/FDS disponibles; envases íntegros", criterio: "Cerrado, identificado y íntegro" },
      { id: "productos_trasvase", label: "Productos en trasvase/pulverizador (si aplica): etiquetado secundario completo (producto, dilución, fecha)", criterio: "Etiquetado completo" },
      { id: "utiles_limpieza", label: "Útiles de limpieza en buen estado e identificados/segregados (si aplica por uso/zonas)", criterio: "Identificados y segregados" },
    ]
  },
  {
    id: "exteriores",
    title: "EXTERIORES",
    points: [
      { id: "exterior_puerta_muelle", label: "Puerta muelle", criterio: "Sin suciedad visible; sin acumulaciones; sin daños" },
      { id: "exterior_buzon", label: "Buzón", criterio: "Sin suciedad visible; sin acumulaciones; sin daños" },
      { id: "exterior_acera", label: "Acera", criterio: "Sin suciedad visible; sin acumulaciones; sin daños" },
    ]
  },
  {
    id: "zona_recepcion_mercancias",
    title: "ZONA DE RECEPCIÓN DE MERCANCÍAS",
    points: [
      { id: "recepcion_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "recepcion_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "recepcion_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "recepcion_alarma_incendios", label: "Alarma antincendios", criterio: "Funcionamiento correcto" },
      { id: "recepcion_alarma_antirrobo", label: "Alarma antirrobo", criterio: "Funcionamiento correcto" },
      { id: "recepcion_puerta_altillo", label: "Puerta altillo", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "recepcion_puerta_planta", label: "Puerta entrada a planta", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "recepcion_luminaria", label: "Luminaria", criterio: "Funcionamiento correcto; sin daños" },
    ]
  },
  {
    id: "comedor",
    title: "COMEDOR",
    points: [
      { id: "comedor_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "comedor_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "comedor_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "comedor_ventana", label: "Ventana", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "comedor_alumbrado", label: "Alumbrado", criterio: "Funcionamiento correcto" },
      { id: "comedor_manivelas_luz", label: "Manivelas de la luz", criterio: "Funcionamiento correcto; en buen estado" },
      { id: "comedor_mesa", label: "Mesa", criterio: "Limpia; en buen estado" },
      { id: "comedor_sillas", label: "Sillas", criterio: "Limpias; en buen estado" },
      { id: "comedor_banco_cocina", label: "Banco de cocina", criterio: "Limpio; en buen estado" },
      { id: "comedor_vitroceramica", label: "Vitrocerámica", criterio: "Limpia; en buen estado" },
      { id: "comedor_pila", label: "Pila", criterio: "Limpia; en buen estado" },
      { id: "comedor_horno", label: "Horno", criterio: "Limpio; en buen estado" },
      { id: "comedor_microondas", label: "Microondas", criterio: "Limpio; en buen estado" },
      { id: "comedor_muebles_cocina", label: "Muebles de cocina", criterion: "Limpios; en buen estado" },
      { id: "comedor_puerta", label: "Puerta", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "comedor_extractor", label: "Extractor", criterio: "Limpio; funcionamiento correcto" },
    ]
  },
  {
    id: "recepcion",
    title: "RECEPCIÓN",
    points: [
      { id: "recep_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "recep_puerta", label: "Puerta", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "recep_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "recep_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "recep_luminarias", label: "Luminarias", criterio: "Funcionamiento correcto" },
      { id: "recep_ventana", label: "Ventana", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "recep_mesa_trabajo", label: "Mesa de trabajo", criterio: "Limpia; en buen estado" },
      { id: "recep_ordenador", label: "Ordenador", criterio: "Funcionamiento correcto" },
      { id: "recep_impresora", label: "Impresora", criterio: "Funcionamiento correcto" },
      { id: "recep_gavetas", label: "Gavetas", criterio: "Ordenadas; en buen estado" },
      { id: "recep_armario_archivador", label: "Armario archivador", criterio: "Ordenado; en buen estado" },
      { id: "recep_armario_wifi", label: "Armario wifi", criterio: "Ordenado; en buen estado" },
      { id: "recep_armario_alarma", label: "Armario alarma", criterio: "Cerrado; en buen estado" },
      { id: "recep_manivela_luz", label: "Manivela luz", criterio: "Funcionamiento correcto" },
    ]
  },
  {
    id: "vestuarios",
    title: "VESTUARIOS",
    points: [
      { id: "vest_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "vest_puerta", label: "Puerta", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "vest_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "vest_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "vest_luminarias", label: "Luminarias", criterio: "Funcionamiento correcto" },
      { id: "vest_manilla_luz", label: "Manilla de la luz", criterio: "Funcionamiento correcto" },
      { id: "vest_taquillas", label: "Taquillas", criterio: "Ordenadas; en buen estado" },
      { id: "vest_armario", label: "Armario", criterio: "Ordenado; en buen estado" },
      { id: "vest_banco", label: "Banco", criterio: "Limpio; en buen estado" },
      { id: "vest_perchero", label: "Perchero", criterio: "En buen estado" },
    ]
  },
  {
    id: "otros",
    title: "OTROS",
    points: [
      { id: "otros_productos_limpieza", label: "Ubicación de productos limpieza", criterio: "Cerrado con llave" },
    ]
  },
  {
    id: "bano",
    title: "BAÑO",
    points: [
      { id: "bano_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "bano_puerta", label: "Puerta", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "bano_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "bano_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "bano_luminarias", label: "Luminarias", criterio: "Funcionamiento correcto" },
      { id: "bano_manilla_luz", label: "Manilla de la luz", criterio: "Funcionamiento correcto" },
      { id: "bano_espejo", label: "Espejo", criterio: "Limpio; sin daños" },
      { id: "bano_pila", label: "Pila", criterio: "Limpia; sin obstructions" },
      { id: "bano_toallero", label: "Toallero", criterio: "Funcionamiento correcto" },
      { id: "bano_cubo", label: "Cubo", criterio: "Limpio; en buen estado" },
      { id: "bano_secamanos", label: "Secamanos", criterio: "Funcionamiento correcto" },
      { id: "bano_wc", label: "Wc", criterio: "Limpio; funcionamiento correcto" },
      { id: "bano_armario", label: "Armario", criterio: "Ordenado; en buen estado" },
      { id: "bano_portarollos", label: "Portarollos", criterio: "Con papel; en buen estado" },
      { id: "bano_mampara", label: "Mampara", criterio: "Limpia; sin daños" },
      { id: "bano_plato_ducha", label: "Plato de ducha", criterio: "Limpio; sin obstrucciones" },
      { id: "bano_toalleros", label: "Toalleros", criterio: "Limpios; en buen estado" },
    ]
  },
  {
    id: "sala_maquinas",
    title: "SALA DE MAQUINAS",
    points: [
      { id: "maq_puerta_acceso", label: "Puerta de acceso", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "maq_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "maq_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "maq_armarios_electricos", label: "Armarios eléctricos", criterio: "Cerrados; en buen estado" },
      { id: "maq_luminaria", label: "Luminaria", criterio: "Funcionamiento correcto" },
      { id: "maq_manilla_luz", label: "Manilla de la luz", criterio: "Funcionamiento correcto" },
      { id: "maq_escalera_acceso", label: "Escalera de acceso", criterio: "En buen estado; safe" },
      { id: "maq_barandilla_escalera", label: "Barandilla escalera", criterio: "En buen estado; safe" },
      { id: "maq_bombas", label: "Bombas", criterio: "Funcionamiento correcto; sin fugas" },
      { id: "maq_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "maq_extintores", label: "Extintores", criterio: "Accesibles; en buen estado; fecha válida" },
    ]
  },
  {
    id: "pasillo_produccion",
    title: "PASILLO PRODUCCIÓN (PERSONAL Y MERCANCÍAS)",
    points: [
      { id: "pasillo_puerta_acceso", label: "Puerta de acceso", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "pasillo_puertas_planta_camaras", label: "Puertas acceso planta y cámaras", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "pasillo_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "pasillo_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "pasillo_luminaria", label: "Luminaria", criterio: "Funcionamiento correcto" },
      { id: "pasillo_extintores", label: "Extintores", criterio: "Accesibles; en buen estado" },
      { id: "pasillo_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "pasillo_manillas_luz", label: "Manillas de la luz", criterio: "Funcionamiento correcto" },
    ]
  },
  {
    id: "almacen_seco",
    title: "ALMACÉN DE SECO",
    points: [
      { id: "seco_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "seco_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "seco_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "seco_puertas_acceso", label: "Puertas de acceso", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "seco_luminaria", label: "Luminaria", criterio: "Funcionamiento correcto" },
      { id: "seco_manillas_luz", label: "Manillas de la luz", criterio: "Funcionamiento correcto" },
      { id: "seco_luces_emergencia", label: "Luces de emergencia", criterio: "Funcionamiento correcto" },
      { id: "seco_estanterias", label: "Estanterías", criterio: "En buen estado; correctamente organizadas" },
      { id: "seco_productos_ubicados", label: "Productos ubicados correctamente", criterio: "Ordenados por ubicación" },
      { id: "seco_productos_identificados", label: "Productos identificados correctamente", criterio: "Etiquetados correctamente" },
      { id: "seco_productos_cerrados", label: "Productos cerrados correctamente", criterio: "Envases cerrados" },
      { id: "seco_fifo_fefo", label: "FIFO/FEFO aplicado y sin caducados", criterio: "Cumple FEFO/FIFO; sin caducados." },
      { id: "seco_integridad_envases", label: "Integridad de envases/embalajes (sin roturas/derrames)", criterio: "Cumple." },
      { id: "seco_trampas_cebos", label: "Estado de trampas y cebos", criterio: "Sin indicios de plagas; en buen estado" },
    ]
  },
  {
    id: "almacen_aceite",
    title: "ALMACÉN DE ACEITE",
    points: [
      { id: "aceite_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "aceite_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "aceite_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "aceite_puertas_acceso", label: "Puertas de acceso", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "aceite_luminaria", label: "Luminaria", criterio: "Funcionamiento correcto" },
      { id: "aceite_manillas_luz", label: "Manillas de la luz", criterio: "Funcionamiento correcto" },
      { id: "aceite_luces_emergencia", label: "Luces de emergencia", criterio: "Funcionamiento correcto" },
      { id: "aceite_estanterias", label: "Estanterías", criterio: "En buen estado; correctamente organizadas" },
    ]
  },
  {
    id: "almacen_refrigerado",
    title: "ALMACÉN REFRIGERADO",
    points: [
      { id: "refri_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "refri_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "refri_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "refri_hielo_condensacion", label: "Ausencia de hielo/condensación excesiva", criterio: "Cumple; sin riesgos de contaminación." },
      { id: "refri_puertas_acceso", label: "Puertas de acceso", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; cierre correcto" },
      { id: "refri_luminaria", label: "Luminaria", criterio: "Funcionamiento correcto" },
      { id: "refri_manillas_luz", label: "Manillas de la luz", criterio: "Funcionamiento correcto" },
      { id: "refri_luces_emergencia", label: "Luces de emergencia", criterio: "Funcionamiento correcto" },
      { id: "refri_estanterias", label: "Estanterías", criterio: "En buen estado; correctamente organizadas" },
      { id: "refri_productos_ubicados", label: "Productos ubicados correctamente", criterio: "Ordenados por ubicación" },
      { id: "refri_productos_identificados", label: "Productos identificados correctamente", criterio: "Etiquetados correctamente" },
      { id: "refri_productos_cerrados", label: "Productos cerrados correctamente", criterio: "Envases cerrados" },
    ]
  },
  {
    id: "laboratorio",
    title: "LABORATORIO",
    points: [
      { id: "lab_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "lab_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "lab_puerta_acceso", label: "Puerta de acceso", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "lab_estanterias", label: "Estanterías", criterio: "Ordenadas; en buen estado" },
      { id: "lab_ordenador", label: "Ordenador", criterio: "Funcionamiento correcto" },
      { id: "lab_phmetro", label: "Phmetro", criterio: "Calibrado; en buen estado" },
      { id: "lab_lupa", label: "Lupa", criterio: "En buen estado; funcionamiento correcto" },
      { id: "lab_productos_identificados", label: "Productos identificados correctamente", criterio: "Etiquetados correctamente" },
      { id: "lab_productos_cerrados", label: "Productos cerrados correctamente", criterio: "Envases cerrados" },
      { id: "lab_trituradora_ajos", label: "Trituradora de ajos", criterio: "Limpia; en buen estado" },
    ]
  },
  {
    id: "obrador",
    title: "OBRADOR",
    points: [
      { id: "obrador_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "obrador_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "obrador_puertas_acceso", label: "Puertas de acceso", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "obrador_maquina_emulsionadora", label: "Máquina emulsionadora", criterio: "Limpia; en buen estado" },
      { id: "obrador_suelos_zocalos", label: "Suelos y zócalos", criterio: "Limpios; sin daños" },
      { id: "obrador_desag_sumideros", label: "Desagües/sumideros (solo limpieza): sin acumulaciones, sin olores, sin obstrucciones", criterio: "Conforme a limpieza; sin acumulaciones." },
      { id: "obrador_condensaciones", label: "Ausencia de condensaciones/goteos sobre zonas de proceso", criterio: "No hay goteos/condensación sobre áreas de contacto/abiertas." },
      { id: "obrador_manillas_luz", label: "Manillas de la luz", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "obrador_cubos_basura", label: "Cubos de basura", criterio: "Limpios; en buen estado" },
      { id: "obrador_pilas_grifos", label: "Pilas y grifos", criterio: "Limpios; funcionamiento correcto" },
      { id: "obrador_envasadora_tarrinas", label: "Envasadora de tarrinas", criterio: "Limpia; en buen estado" },
      { id: "obrador_envasadora_cubos", label: "Envasadora de cubos", criterio: "Limpia; en buen estado" },
      { id: "obrador_luminaria", label: "Luminaria", criterio: "Funcionamiento correcto" },
      { id: "obrador_contenedores_residuos_estado", label: "Contenedores de residuos estado", criterio: "En buen estado; limpios" },
      { id: "obrador_contenedores_residuos_ubicados", label: "Contenedores de residuos ubicados", criterio: "Ubicados correctamente" },
    ]
  },
  {
    id: "zona_encajado",
    title: "ZONA DE ENCAJADO",
    points: [
      { id: "encajado_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "encajado_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "encajado_puerta_acceso", label: "Puerta de acceso", criterio: "Sin suciedad visible; sin daños; cierre correcto" },
      { id: "encajado_luminaria", label: "Luminaria", criterio: "Funcionamiento correcto" },
      { id: "encajado_manillas_luz", label: "Manillas de la luz", criterio: "Funcionamiento correcto" },
      { id: "encajado_suelo", label: "Suelo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
    ]
  },
  {
    id: "zona_limpieza",
    title: "ZONA LIMPIEZA",
    points: [
      { id: "limp_zona_paredes", label: "Paredes", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "limp_zona_techo", label: "Techo", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños" },
      { id: "limp_zona_cortinas_acceso", label: "Cortinas de acceso", criterio: "En buen estado; limpias" },
      { id: "limp_zona_estanterias", label: "Estanterías", criterio: "Ordenadas; en buen estado" },
      { id: "limp_zona_productos_ubicados", label: "Productos ubicados correctamente", criterio: "Ordenados por ubicación" },
      { id: "limp_zona_fregadero", label: "Fregadero", criterio: "Limpio; funcionamiento correcto" },
      { id: "limp_zona_grifo", label: "Grifo", criterio: "Funcionamiento correcto; sin fugas" },
      { id: "limp_zona_desag_sumideros", label: "Desagües/sumideros (solo limpieza): sin acumulaciones", criterio: "Conforme a limpieza; sin acumulaciones." },
      { id: "limp_zona_separador_grasas", label: "Separador de grasas: estado general sin rebose/olores/derrame (revisión visual)", criterio: "Correcto; si anomalías, comunicar y registrar." },
      { id: "limp_zona_productos_identificados", label: "Productos identificados correctamente", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "limp_zona_productos_cerrados", label: "Productos cerrados correctamente", criterio: "Envases cerrados" },
    ]
  },
  {
    id: "manipuladores",
    title: "MANIPULADORES",
    points: [
      { id: "manip_ropa_gorro", label: "Ropa de trabajo y gorro", criterio: "Uniforme de uso exclusivo en planta (blanco), limpio e íntegro (sin roturas). Gorro/cubre-cabello correctamente colocado (y cubrebarba si procede).EPI de producción: mascarilla, manguitos, delantal plástico y burca cuando aplique; material azul/detectable si aplica.Sin joyas/relojes y uñas cortas, sin esmalte (según vuestra IT/BPM)." },
      { id: "manip_efectos_personales", label: "No llevan efectos personales", criterio: "Sin efectos personales" },
      { id: "manip_malas_practicas", label: "No se aprecian malas practicas", criterio: "Cumplimiento de BPM y normas de planta" },
      { id: "manip_manos_higiene", label: "Estado de manos/higiene", criterio: "manos limpias, cortes protegidos con apósito detectable, guantes si aplican." },
    ]
  },
  {
    id: "plagas",
    title: "PLAGAS",
    points: [
      { id: "plagas_ubicacion_cebos", label: "Ubicación de los cebos", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "plagas_estado_cebos", label: "Estado de los cebos", criterio: "En buen estado; sin indicios de plagas" },
      { id: "plagas_indicios", label: "No se aprecian indicios de plagas", criterio: "Sin indicios" },
      { id: "plagas_plano_cebos", label: "Plano de cebos/trampas actualizado y disponible", criterio: "Plano vigente y coherente con instalación." },
      { id: "plagas_informe_visita", label: "Informe/visita empresa de control de plagas disponible (si aplica)", criterio: "Evidencia archivada." },
    ]
  },
  {
    id: "utiles_limpieza",
    title: "ÚTILES DE LIMPIEZA",
    points: [
      { id: "utiles_friegasuelos", label: "Friegasuelos", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
      { id: "utiles_escoba", label: "Escoba", criterio: "En buen estado; limpia" },
      { id: "utiles_recogedor", label: "Recogedor", criterio: "En buen estado; limpio" },
      { id: "utiles_cubos", label: "Cubos", criterio: "En buen estado; limpios" },
      { id: "utiles_fregonas", label: "Fregonas", criterio: "En buen estado; limpias" },
      { id: "utiles_estado_higienico", label: "Útiles en buen estado higiénico (sin suciedad incrustada)", criterio: "Cumple; si no, retirada." },
      { id: "utiles_contenedores_residuos", label: "Contenedores de residuos", criterio: "Sin suciedad visible; sin acumulaciones; sin mohos/condensaciones; sin daños; orden e identificación correctos." },
    ]
  },
  {
    id: "areas_food_defense",
    title: "ÁREAS FOOD DEFENSE",
    points: [
      { id: "food_defense_puerta_exterior", label: "Puerta exterior cerrada", criterio: "Acceso controlado; puertas cerradas y sin holguras." },
      { id: "food_defense_puerta_sala_maquinas", label: "Puerta sala de máquinas cerrada", criterio: "Cerrada; sin holguras" },
      { id: "food_defense_sistema_alarma", label: "Funcionamiento de Sistema de alarma", criterio: "Funcionando correctamente" },
      { id: "food_defense_puerta_altillo", label: "Puerta altillo cerrada", criterio: "Cerrada; sin holguras" },
      { id: "food_defense_puerta_oficinas", label: "Puerta oficinas cerrada", criterio: "Cerrada; sin holguras" },
      { id: "food_defense_control_llaves", label: "Control de llaves y accesos a zona de proceso (si aplica)", criterio: "Controlado; sin accesos no autorizados." },
      { id: "food_defense_registro_visitas", label: "Registro de visitas/contratas del mes disponible (si aplica)", criterio: "Registro y acompañamiento cuando aplique." },
      { id: "food_defense_integridad_puertas", label: "Integridad de puertas/burletes (sin holguras, cierre correcto)", criterio: "Cumple." },
    ]
  }
];

const RevisionReport = ({ onClose, user, apiBase, onNotify, onConfirm }) => {
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    firmaNombreResponsable: "",
    firmaImagenBase64Responsable: "",
  });

  const [checklistStates, setChecklistStates] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRefResponsable = useRef(null);
  const isDrawingRefResponsable = useRef(false);

  const notify = (type, message) => {
    if (onNotify) onNotify(type, message);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleChecklistChange = (pointId, field, value) => {
    setChecklistStates((prev) => ({
      ...prev,
      [pointId]: {
        ...prev[pointId],
        [field]: value,
      },
    }));
  };

const validateForm = () => {
    const newErrors = {};
    if (!formData.fecha) newErrors.fecha = "La fecha es requerida";
    if (!formData.hora) newErrors.hora = "La hora es requerida";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Efecto para el canvas del responsable
  useEffect(() => {
    const canvas = canvasRefResponsable.current;
    if (!canvas) return;

    let ctx;

    const setup = () => {
      requestAnimationFrame(() => {
        ctx = resizeSignatureCanvas(canvas);
      });
    };

    const resizeHandler = () => { ctx = resizeSignatureCanvas(canvas); };

    setup();
    window.addEventListener("resize", resizeHandler);

    const getCoordinates = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDrawing = (e) => {
      e.preventDefault();
      if (e.pointerId && canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      isDrawingRefResponsable.current = true;

      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e) => {
      if (!isDrawingRefResponsable.current) return;
      e.preventDefault();
      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = (e) => {
      if (e?.pointerId && canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch {}
      }
      if (!isDrawingRefResponsable.current) return;

      isDrawingRefResponsable.current = false;
      setFormData((prev) => ({ ...prev, firmaImagenBase64Responsable: canvas.toDataURL("image/png") }));
    };

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", startDrawing);
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointerleave", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);

    return () => {
      window.removeEventListener("resize", resizeHandler);
      canvas.removeEventListener("pointerdown", startDrawing);
      canvas.removeEventListener("pointermove", draw);
      canvas.removeEventListener("pointerup", stopDrawing);
      canvas.removeEventListener("pointerleave", stopDrawing);
      canvas.removeEventListener("pointercancel", stopDrawing);
};
  }, []);

  const clearSignatureResponsable = () => {
    clearSignatureCanvas(canvasRefResponsable.current);
    setFormData((prev) => ({ ...prev, firmaImagenBase64Responsable: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Transform checklistStates to match backend expected format
      // Backend expects: sections array with points having {id, label, value, comments}
      const transformedSections = REVISION_SECTIONS.map(section => ({
        id: section.id,
        title: section.title,
        points: section.points.map(point => {
          const state = checklistStates[point.id] || {};
          return {
            id: point.id,
            label: point.label,
            value: state.estado || "",  // Backend expects 'value' not 'estado'
            comments: state.comentarios || ""  // Backend expects 'comments' not 'comentarios'
          };
        })
      }));

      const response = await fetch(`${apiBase}/createInformeRevision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({
          employee_id: user?.usuario || user?.employee_id,
          fecha: formData.fecha,
          hora: formData.hora,
          sections: transformedSections,
          firmaNombreResponsable: formData.firmaNombreResponsable,
          firmaResponsableBase64: formData.firmaImagenBase64Responsable,
        }),
      });

      const text = await response.text();
      if (!text) throw new Error("Respuesta vacía del servidor");
      const result = JSON.parse(text);

      if (!response.ok) {
        throw new Error(result.message || result.error || `Error del servidor (${response.status})`);
      }

      notify("success", "Informe de Revisión enviado correctamente.");
      onClose();
    } catch (error) {
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        notify("error", "Error de conexión. Verifique su conexión a internet.");
      } else {
        notify("error", `Error al enviar el formulario: ${error.message}`);
      }
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container" style={{ maxWidth: "1200px", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="tool-registration-header">
          <h1>Informe de Revisión</h1>
          <button type="button" className="tool-registration-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tool-registration-form" style={{ padding: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="form-group">
              <label htmlFor="fecha">FECHA <span className="required">*</span></label>
              <input
                type="date"
                id="fecha"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                className={errors.fecha ? "error" : ""}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
              />
              {errors.fecha && <span className="error-message">{errors.fecha}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="hora">HORA <span className="required">*</span></label>
              <input
                type="time"
                id="hora"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                className={errors.hora ? "error" : ""}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
              />
              {errors.hora && <span className="error-message">{errors.hora}</span>}
            </div>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            {REVISION_SECTIONS.map((section) => (
              <div key={section.id} style={{ marginBottom: "1.5rem", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ backgroundColor: "#012B5C", color: "white", padding: "0.75rem 1rem", fontWeight: "600" }}>
                  {section.title}
                </div>
                <div style={{ padding: "0.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f1f5f9" }}>
                        <th style={{ padding: "0.5rem", textAlign: "left", border: "1px solid #e2e8f0", width: "30%" }}>Punto a supervisar</th>
                        <th style={{ padding: "0.5rem", textAlign: "left", border: "1px solid #e2e8f0", width: "25%" }}>Criterio de aceptación</th>
                        <th style={{ padding: "0.5rem", textAlign: "center", border: "1px solid #e2e8f0", width: "12%" }}>Estado</th>
                        <th style={{ padding: "0.5rem", textAlign: "left", border: "1px solid #e2e8f0", width: "33%" }}>Comentarios / Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.points.map((point) => {
                        const state = checklistStates[point.id] || {};
                        return (
                          <tr key={point.id}>
                            <td style={{ padding: "0.5rem", border: "1px solid #e2e8f0" }}>
                              {point.label}
                            </td>
                            <td style={{ padding: "0.5rem", border: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#64748b" }}>
                              {point.criterio}
                            </td>
                            <td style={{ padding: "0.5rem", border: "1px solid #e2e8f0", textAlign: "center" }}>
                              <select
                                value={state.estado || ""}
                                onChange={(e) => handleChecklistChange(point.id, "estado", e.target.value)}
                                style={{ 
                                  padding: "0.25rem", 
                                  borderRadius: "4px", 
                                  border: "1px solid #cbd5e1",
                                  fontWeight: "600",
                                  width: "100%",
                                  backgroundColor: state.estado === "C" ? "#dcfce7" : state.estado === "NC" ? "#fee2e2" : state.estado === "NA" ? "#f1f5f9" : "white"
                                }}
                              >
                                <option value="">-</option>
                                <option value="C">C</option>
                                <option value="NC">NC</option>
                                <option value="NA">NA</option>
                              </select>
                            </td>
                            <td style={{ padding: "0.5rem", border: "1px solid #e2e8f0" }}>
                              <input
                                type="text"
                                value={state.comentarios || ""}
                                onChange={(e) => handleChecklistChange(point.id, "comentarios", e.target.value)}
                                placeholder="Comentarios..."
                                style={{ 
                                  width: "100%", 
                                  padding: "0.25rem", 
                                  borderRadius: "4px", 
                                  border: "1px solid #cbd5e1" 
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
))}
          </div>

          <div className="form-group form-group--signature">
            <label htmlFor="firmaNombreResponsable">
              FIRMA DEL RESPONSABLE
            </label>
            <div className="signature-container">
              <div className="signature-name">
                <input
                  type="text"
                  id="firmaNombreResponsable"
                  name="firmaNombreResponsable"
                  value={formData.firmaNombreResponsable}
                  onChange={handleChange}
                  placeholder="Escriba el nombre del responsable que firma"
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                />
              </div>
              <canvas ref={canvasRefResponsable} className="signature-canvas" data-signature="responsable"></canvas>
              <p className="signature-hint">Dibuja la firma del responsable en el recuadro</p>
              <div className="signature-controls">
                <button type="button" className="dk-btn dk-btn--ghost" onClick={clearSignatureResponsable}>
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="dk-btn dk-btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="dk-btn dk-btn--primary" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RevisionReport;

