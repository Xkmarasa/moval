// Script de prueba para enviar un informe de revisión con todos los campos NC
// Uso: node test_revision_report.js

const API_BASE = "https://createinformerevision-xm47trhajq-uc.a.run.app";

// Definición de secciones y puntos (igual que en el frontend)
const REVISION_SECTIONS = [
  {
    id: "verificacion_limpieza",
    title: "VERIFICACIÓN SISTEMA LIMPIEZA (documental y operativa)",
    points: [
      { id: "erp_analisis_inicial", label: "ERP: registro de 'análisis inicial' diario disponible y cumplimentado (preoperacional)" },
      { id: "erp_analisis_limpieza", label: "ERP: registro de 'análisis de limpieza' disponible" },
      { id: "plan_analiticas", label: "Plan de analíticas de superficie (PG03.2-2)" },
      { id: "gestion_desviaciones", label: "Gestión de desviaciones" },
      { id: "almacen_quimicos", label: "Almacén de químicos" },
      { id: "productos_trasvase", label: "Productos en trasvase/pulverizador" },
      { id: "utiles_limpieza", label: "Útiles de limpieza" },
    ]
  },
  {
    id: "exteriores",
    title: "EXTERIORES",
    points: [
      { id: "exterior_puerta_muelle", label: "Puerta muelle" },
      { id: "exterior_buzon", label: "Buzón" },
      { id: "exterior_acera", label: "Acera" },
    ]
  },
  {
    id: "zona_recepcion_mercancias",
    title: "ZONA DE RECEPCIÓN DE MERCANCÍAS",
    points: [
      { id: "recepcion_suelo", label: "Suelo" },
      { id: "recepcion_techo", label: "Techo" },
      { id: "recepcion_paredes", label: "Paredes" },
      { id: "recepcion_alarma_incendios", label: "Alarma antincendios" },
      { id: "recepcion_alarma_antirrobo", label: "Alarma antirrobo" },
      { id: "recepcion_puerta_altillo", label: "Puerta altillo" },
      { id: "recepcion_puerta_planta", label: "Puerta entrada a planta" },
      { id: "recepcion_luminaria", label: "Luminaria" },
    ]
  },
  {
    id: "comedor",
    title: "COMEDOR",
    points: [
      { id: "comedor_suelo", label: "Suelo" },
      { id: "comedor_techo", label: "Techo" },
      { id: "comedor_paredes", label: "Paredes" },
      { id: "comedor_ventana", label: "Ventana" },
      { id: "comedor_alumbrado", label: "Alumbrado" },
      { id: "comedor_manivelas_luz", label: "Manivelas de la luz" },
      { id: "comedor_mesa", label: "Mesa" },
      { id: "comedor_sillas", label: "Sillas" },
      { id: "comedor_banco_cocina", label: "Banco de cocina" },
      { id: "comedor_vitroceramica", label: "Vitrocerámica" },
      { id: "comedor_pila", label: "Pila" },
      { id: "comedor_horno", label: "Horno" },
      { id: "comedor_microondas", label: "Microondas" },
      { id: "comedor_muebles_cocina", label: "Muebles de cocina" },
      { id: "comedor_puerta", label: "Puerta" },
      { id: "comedor_extractor", label: "Extractor" },
    ]
  },
  {
    id: "recepcion",
    title: "RECEPCIÓN",
    points: [
      { id: "recep_suelo", label: "Suelo" },
      { id: "recep_puerta", label: "Puerta" },
      { id: "recep_paredes", label: "Paredes" },
      { id: "recep_techo", label: "Techo" },
      { id: "recep_luminarias", label: "Luminarias" },
      { id: "recep_ventana", label: "Ventana" },
      { id: "recep_mesa_trabajo", label: "Mesa de trabajo" },
      { id: "recep_ordenador", label: "Ordenador" },
      { id: "recep_impresora", label: "Impresora" },
      { id: "recep_gavetas", label: "Gavetas" },
      { id: "recep_armario_archivador", label: "Armario archivador" },
      { id: "recep_armario_wifi", label: "Armario wifi" },
      { id: "recep_armario_alarma", label: "Armario alarma" },
      { id: "recep_manivela_luz", label: "Manivela luz" },
    ]
  },
  {
    id: "vestuarios",
    title: "VESTUARIOS",
    points: [
      { id: "vest_suelo", label: "Suelo" },
      { id: "vest_puerta", label: "Puerta" },
      { id: "vest_paredes", label: "Paredes" },
      { id: "vest_techo", label: "Techo" },
      { id: "vest_luminarias", label: "Luminarias" },
      { id: "vest_manilla_luz", label: "Manilla de la luz" },
      { id: "vest_taquillas", label: "Taquillas" },
      { id: "vest_armario", label: "Armario" },
      { id: "vest_banco", label: "Banco" },
      { id: "vest_perchero", label: "Perchero" },
    ]
  },
  {
    id: "otros",
    title: "OTROS",
    points: [
      { id: "otros_productos_limpieza", label: "Ubicación de productos limpieza" },
    ]
  },
  {
    id: "bano",
    title: "BAÑO",
    points: [
      { id: "bano_suelo", label: "Suelo" },
      { id: "bano_puerta", label: "Puerta" },
      { id: "bano_paredes", label: "Paredes" },
      { id: "bano_techo", label: "Techo" },
      { id: "bano_luminarias", label: "Luminarias" },
      { id: "bano_manilla_luz", label: "Manilla de la luz" },
      { id: "bano_espejo", label: "Espejo" },
      { id: "bano_pila", label: "Pila" },
      { id: "bano_toallero", label: "Toallero" },
      { id: "bano_cubo", label: "Cubo" },
      { id: "bano_secamanos", label: "Secamanos" },
      { id: "bano_wc", label: "Wc" },
      { id: "bano_armario", label: "Armario" },
      { id: "bano_portarollos", label: "Portarollos" },
      { id: "bano_mampara", label: "Mampara" },
      { id: "bano_plato_ducha", label: "Plato de ducha" },
      { id: "bano_toalleros", label: "Toalleros" },
    ]
  },
  {
    id: "sala_maquinas",
    title: "SALA DE MAQUINAS",
    points: [
      { id: "maq_puerta_acceso", label: "Puerta de acceso" },
      { id: "maq_paredes", label: "Paredes" },
      { id: "maq_techo", label: "Techo" },
      { id: "maq_armarios_electricos", label: "Armarios eléctricos" },
      { id: "maq_luminaria", label: "Luminaria" },
      { id: "maq_manilla_luz", label: "Manilla de la luz" },
      { id: "maq_escalera_acceso", label: "Escalera de acceso" },
      { id: "maq_barandilla_escalera", label: "Barandilla escalera" },
      { id: "maq_bombas", label: "Bombas" },
      { id: "maq_suelo", label: "Suelo" },
      { id: "maq_extintores", label: "Extintores" },
    ]
  },
  {
    id: "pasillo_produccion",
    title: "PASILLO PRODUCCIÓN",
    points: [
      { id: "pasillo_puerta_acceso", label: "Puerta de acceso" },
      { id: "pasillo_puertas_planta_camaras", label: "Puertas acceso planta y cámaras" },
      { id: "pasillo_techo", label: "Techo" },
      { id: "pasillo_paredes", label: "Paredes" },
      { id: "pasillo_luminaria", label: "Luminaria" },
      { id: "pasillo_extintores", label: "Extintores" },
      { id: "pasillo_suelo", label: "Suelo" },
      { id: "pasillo_manillas_luz", label: "Manillas de la luz" },
    ]
  },
  {
    id: "almacen_seco",
    title: "ALMACÉN DE SECO",
    points: [
      { id: "seco_paredes", label: "Paredes" },
      { id: "seco_techo", label: "Techo" },
      { id: "seco_suelo", label: "Suelo" },
      { id: "seco_puertas_acceso", label: "Puertas de acceso" },
      { id: "seco_luminaria", label: "Luminaria" },
      { id: "seco_manillas_luz", label: "Manillas de la luz" },
      { id: "seco_luces_emergencia", label: "Luces de emergencia" },
      { id: "seco_estanterias", label: "Estanterías" },
      { id: "seco_productos_ubicados", label: "Productos ubicados correctamente" },
      { id: "seco_productos_identificados", label: "Productos identificados correctamente" },
      { id: "seco_productos_cerrados", label: "Productos cerrados correctamente" },
      { id: "seco_fifo_fefo", label: "FIFO/FEFO aplicado y sin caducados" },
      { id: "seco_integridad_envases", label: "Integridad de envases/embalajes" },
      { id: "seco_trampas_cebos", label: "Estado de trampas y cebos" },
    ]
  },
  {
    id: "almacen_aceite",
    title: "ALMACÉN DE ACEITE",
    points: [
      { id: "aceite_paredes", label: "Paredes" },
      { id: "aceite_techo", label: "Techo" },
      { id: "aceite_suelo", label: "Suelo" },
      { id: "aceite_puertas_acceso", label: "Puertas de acceso" },
      { id: "aceite_luminaria", label: "Luminaria" },
      { id: "aceite_manillas_luz", label: "Manillas de la luz" },
      { id: "aceite_luces_emergencia", label: "Luces de emergencia" },
      { id: "aceite_estanterias", label: "Estanterías" },
    ]
  },
  {
    id: "almacen_refrigerado",
    title: "ALMACÉN REFRIGERADO",
    points: [
      { id: "refri_paredes", label: "Paredes" },
      { id: "refri_techo", label: "Techo" },
      { id: "refri_suelo", label: "Suelo" },
      { id: "refri_hielo_condensacion", label: "Ausencia de hielo/condensación excesiva" },
      { id: "refri_puertas_acceso", label: "Puertas de acceso" },
      { id: "refri_luminaria", label: "Luminaria" },
      { id: "refri_manillas_luz", label: "Manillas de la luz" },
      { id: "refri_luces_emergencia", label: "Luces de emergencia" },
      { id: "refri_estanterias", label: "Estanterías" },
      { id: "refri_productos_ubicados", label: "Productos ubicados correctamente" },
      { id: "refri_productos_identificados", label: "Productos identificados correctamente" },
      { id: "refri_productos_cerrados", label: "Productos cerrados correctamente" },
    ]
  },
  {
    id: "laboratorio",
    title: "LABORATORIO",
    points: [
      { id: "lab_paredes", label: "Paredes" },
      { id: "lab_techo", label: "Techo" },
      { id: "lab_puerta_acceso", label: "Puerta de acceso" },
      { id: "lab_estanterias", label: "Estanterías" },
      { id: "lab_ordenador", label: "Ordenador" },
      { id: "lab_phmetro", label: "Phmetro" },
      { id: "lab_lupa", label: "Lupa" },
      { id: "lab_productos_identificados", label: "Productos identificados correctamente" },
      { id: "lab_productos_cerrados", label: "Productos cerrados correctamente" },
      { id: "lab_trituradora_ajos", label: "Trituradora de ajos" },
    ]
  },
  {
    id: "obrador",
    title: "OBRADOR",
    points: [
      { id: "obrador_paredes", label: "Paredes" },
      { id: "obrador_techo", label: "Techo" },
      { id: "obrador_puertas_acceso", label: "Puertas de acceso" },
      { id: "obrador_maquina_emulsionadora", label: "Máquina emulsionadora" },
      { id: "obrador_suelos_zocalos", label: "Suelos y zócalos" },
      { id: "obrador_desag_sumideros", label: "Desagües/sumideros" },
      { id: "obrador_condensaciones", label: "Ausencia de condensaciones/goteos" },
      { id: "obrador_manillas_luz", label: "Manillas de la luz" },
      { id: "obrador_cubos_basura", label: "Cubos de basura" },
      { id: "obrador_pilas_grifos", label: "Pilas y grifos" },
      { id: "obrador_envasadora_tarrinas", label: "Envasadora de tarrinas" },
      { id: "obrador_envasadora_cubos", label: "Envasadora de cubos" },
      { id: "obrador_luminaria", label: "Luminaria" },
      { id: "obrador_contenedores_residuos_estado", label: "Contenedores de residuos estado" },
      { id: "obrador_contenedores_residuos_ubicados", label: "Contenedores de residuos ubicados" },
    ]
  },
  {
    id: "zona_encajado",
    title: "ZONA DE ENCAJADO",
    points: [
      { id: "encajado_paredes", label: "Paredes" },
      { id: "encajado_techo", label: "Techo" },
      { id: "encajado_puerta_acceso", label: "Puerta de acceso" },
      { id: "encajado_luminaria", label: "Luminaria" },
      { id: "encajado_manillas_luz", label: "Manillas de la luz" },
      { id: "encajado_suelo", label: "Suelo" },
    ]
  },
  {
    id: "zona_limpieza",
    title: "ZONA LIMPIEZA",
    points: [
      { id: "limp_zona_paredes", label: "Paredes" },
      { id: "limp_zona_techo", label: "Techo" },
      { id: "limp_zona_cortinas_acceso", label: "Cortinas de acceso" },
      { id: "limp_zona_estanterias", label: "Estanterías" },
      { id: "limp_zona_productos_ubicados", label: "Productos ubicados correctamente" },
      { id: "limp_zona_fregadero", label: "Fregadero" },
      { id: "limp_zona_grifo", label: "Grifo" },
      { id: "limp_zona_desag_sumideros", label: "Desagües/sumideros" },
      { id: "limp_zona_separador_grasas", label: "Separador de grasas" },
      { id: "limp_zona_productos_identificados", label: "Productos identificados correctamente" },
      { id: "limp_zona_productos_cerrados", label: "Productos cerrados correctamente" },
    ]
  },
  {
    id: "manipuladores",
    title: "MANIPULADORES",
    points: [
      { id: "manip_ropa_gorro", label: "Ropa de trabajo y gorro" },
      { id: "manip_efectos_personales", label: "No llevan efectos personales" },
      { id: "manip_malas_practicas", label: "No se aprecian malas practicas" },
      { id: "manip_manos_higiene", label: "Estado de manos/higiene" },
    ]
  },
  {
    id: "plagas",
    title: "PLAGAS",
    points: [
      { id: "plagas_ubicacion_cebos", label: "Ubicación de los cebos" },
      { id: "plagas_estado_cebos", label: "Estado de los cebos" },
      { id: "plagas_indicios", label: "No se aprecian indicios de plagas" },
      { id: "plagas_plano_cebos", label: "Plano de cebos/trampas actualizado" },
      { id: "plagas_informe_visita", label: "Informe/visita empresa de control de plagas" },
    ]
  },
  {
    id: "utiles_limpieza",
    title: "ÚTILES DE LIMPIEZA",
    points: [
      { id: "utiles_friegasuelos", label: "Friegasuelos" },
      { id: "utiles_escoba", label: "Escoba" },
      { id: "utiles_recogedor", label: "Recogedor" },
      { id: "utiles_cubos", label: "Cubos" },
      { id: "utiles_fregonas", label: "Fregonas" },
      { id: "utiles_estado_higienico", label: "Útiles en buen estado higiénico" },
      { id: "utiles_contenedores_residuos", label: "Contenedores de residuos" },
    ]
  },
  {
    id: "areas_food_defense",
    title: "ÁREAS FOOD DEFENSE",
    points: [
      { id: "food_defense_puerta_exterior", label: "Puerta exterior cerrada" },
      { id: "food_defense_puerta_sala_maquinas", label: "Puerta sala de máquinas cerrada" },
      { id: "food_defense_sistema_alarma", label: "Funcionamiento de Sistema de alarma" },
      { id: "food_defense_puerta_altillo", label: "Puerta altillo cerrada" },
      { id: "food_defense_puerta_oficinas", label: "Puerta oficinas cerrada" },
      { id: "food_defense_control_llaves", label: "Control de llaves y accesos" },
      { id: "food_defense_registro_visitas", label: "Registro de visitas/contratas" },
      { id: "food_defense_integridad_puertas", label: "Integridad de puertas/burletes" },
    ]
  }
];

// Transformar todas las secciones a formato NC (No Conforme)
// El backend espera un objeto con secciones, no un array
const sectionsObj = {};
REVISION_SECTIONS.forEach(section => {
  const pointsObj = {};
  section.points.forEach(point => {
    pointsObj[point.id] = {
      label: point.label,
      status: "NC",  // Backend espera 'status' no 'value'
      comments: "Prueba de todos los campos NC - Necesita corrección inmediata"
    };
  });
  sectionsObj[section.id] = {
    id: section.id,
    title: section.title,
    points: pointsObj
  };
});

// Calcular fecha y hora actual
const now = new Date();
const fecha = now.toISOString().split('T')[0];
const hora = now.toTimeString().slice(0, 5);

// Datos del formulario - formato que espera el backend
const formData = {
  employee_id: "test_user",
  fecha: fecha,
  hora: hora,
  sections: sectionsObj,  // Objeto, no array
  comments: {},
  firmaNombreEmpleado: "Test Empleado",
  firmaImagenBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  firmaNombreResponsable: "Test Responsable",
  firmaResponsable: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
};

console.log("=== ENVIANDO INFORME DE REVISIÓN DE PRUEBA (TODOS NC) ===");
console.log("Fecha:", fecha);
console.log("Hora:", hora);

// Contar total de puntos
let totalPoints = 0;
REVISION_SECTIONS.forEach(s => totalPoints += s.points.length);
console.log("Total de puntos de verificación:", totalPoints);
console.log("");

// Enviar la solicitud a la URL directa de Cloud Run
fetch(API_BASE, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(formData),
})
  .then(response => {
    console.log("Status de respuesta:", response.status);
    return response.text();
  })
  .then(text => {
    console.log("Respuesta del servidor:");
    console.log(text);
  })
  .catch(error => {
    console.error("Error al enviar el formulario:");
    console.error(error);
  });

