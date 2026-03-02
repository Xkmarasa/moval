/**
 * ALMACEN SECO Y CAMARA GRANDE - Checklist de Limpieza
 */
export const ALMACEN_SECO_CAMARA_GRANDE = {
  id: "ALMACEN_SECO_CAMARA_GRANDE",
  nombre: "ALMACEN SECO Y CAMARA GRANDE",
  icono: "📦",
  elementosZonas: "Suelos, paredes, estanterías, palets, pasillos, puertas de cámara, sensores de temperatura.",
  productoQuimicoUtil: "Desengrasante neutro, desinfectante autorizado, fregona, cubo, mopa, bayeta.",
  instruccionesMetodo: "1. Barrer y retirar residuos. 2. Aplicar desengrasante según dosificación. 3. Fregar suelos y superficies. 4. Aclarar con agua. 5. Aplicar desinfectante. 6. Secar o dejar secar al aire.",

  checklists: {
    SEMANAL: [
      {
        elemento: "SUELOS Y ZOCALOS",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Barrer y fregar suelos (≈100 ml en cubo de 10 l)",
        completado: false
      }
    ],
    MENSUAL: [
      {
        elemento: "PUERTAS DE ACCESO A CAMARA REFRIGERADO",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "EXTINTORES",
        producto: "",
        instrucciones: "",
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
    TRIMESTRAL: [],
    ANUAL: [
      {
        elemento: "PAREDES",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      }
    ],
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
