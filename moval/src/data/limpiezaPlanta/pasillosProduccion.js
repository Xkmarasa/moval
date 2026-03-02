/**
 * PASILLOS PRODUCCION - Checklist de Limpieza
 */
export const PASILLOS_PRODUCCION = {
  id: "PASILLOS_PRODUCCION",
  nombre: "PASILLOS PRODUCCION",
  icono: "🚶",
  elementosZonas: "Suelos, paredes, rodapiés, puertas, señalización.",
  productoQuimicoUtil: "Desengrasante, desinfectante, fregona, cubo, bayeta.",
  instruccionesMetodo: "1. Barrer o aspirar. 2. Aplicar desengrasante. 3. Fregar en sentido de circulación. 4. Aclarar. 5. Aplicar desinfectante. 6. Secar.",

  checklists: {
    DIARIO: [],
    QUINCENAL: [],
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
    ANUAL: [
      {
        elemento: "ESTANTERIAS",
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
        elemento: "PAREDES",
        producto: "",
        instrucciones: "",
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
