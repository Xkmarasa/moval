/**
 * WASH - Checklist de Limpieza
 */
export const WASH = {
  id: "WASH",
  nombre: "WASH",
  icono: "🚿",
  elementosZonas: "Lavabos, suelos, paredes, desagües, dispensadores, espejos.",
  productoQuimicoUtil: "Desincrustante, desinfectante, bayeta, fregona, cubo, cepillo.",
  instruccionesMetodo: "1. Aplicar desincrustante en lavabos y desagües. 2. Fregar suelos y paredes. 3. Aclarar. 4. Desinfectar todas las superficies. 5. Reponer jabón y papel.",

  checklists: {
    DIARIO: [
      {
        elemento: "SUELOS Y ZOCALOS",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Barrer y fregar suelos (≈100 ml en cubo de 10 l)",
        completado: false
      },
      {
        elemento: "PILAS Y GRIFOS",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "CORTINAS DE ACCESO",
        producto: "",
        instrucciones: "",
        completado: false
      }
    ],
    QUINCENAL: [],
    SEMANAL: [],
    MENSUAL: [
      {
        elemento: "ESTANTERIAS",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      }
    ],
    TRIMESTRAL: [],
    SEMESTRAL: [
      {
        elemento: "PAREDES",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      }
    ],
    ANUAL: [],
    CADA_5_ANOS: [
      {
        elemento: "TECHO",
        producto: "CADA 5 AÑOS / ANTES SI SE CONSIDERA NECESARIO",
        instrucciones: "A concretAR por empresa especialista",
        completado: false
      },
      {
        elemento: "LUMINARIA",
        producto: "",
        instrucciones: "",
        completado: false
      }
    ]
  }
};
