/**
 * CÁMARA REFRIGERADO PEQUEÑA Y ALMACEN - Checklist de Limpieza
 */
export const CAMARA_REFRIGERADO_PEQUEÑA_ALMACEN = {
  id: "CAMARA_REFRIGERADO_PEQUEÑA_ALMACEN",
  nombre: "CÁMARA REFRIGERADO PEQUEÑA Y ALMACEN",
  icono: "❄️",
  elementosZonas: "Suelos, paredes, estanterías, evaporadores, rejillas de ventilación, puertas.",
  productoQuimicoUtil: "Desengrasante de baja espuma, desinfectante alimentario, fregona, bayeta, cubo.",
  instruccionesMetodo: "1. Con cámara en frío, retirar productos si procede. 2. Barrer y aspirar. 3. Aplicar desengrasante. 4. Fregar suelos y superficies. 5. Aclarar. 6. Aplicar desinfectante. 7. Cerrar y dejar secar.",

  checklists: {
    SEMANAL: [
      {
        elemento: "SUELOS Y ZOCALOS",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Barrer y fregar suelos (≈100 ml en cubo de 10 l)",
        completado: false
      }
    ],
    MENSUAL: [],
    TRIMESTRAL: [],
    SEMESTRAL: [
      {
        elemento: "EXTINTORES",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "MANILLAS DE LA LUZ",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "LUCES DE EMERGENCIA",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "ESTANTERIAS",
        producto: "",
        instrucciones: "",
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
      },
      {
        elemento: "PAREDES",
        producto: "",
        instrucciones: "",
        completado: false
      }
    ]
  }
};
