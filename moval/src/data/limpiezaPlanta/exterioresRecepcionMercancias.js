/**
 * EXTERIORES Y RECEPCIÓN DE MERCANCIAS - Checklist de Limpieza
 */
export const EXTERIORES_RECEPCION_MERCANCIAS = {
  id: "EXTERIORES_RECEPCION_MERCANCIAS",
  nombre: "EXTERIORES Y RECEPCIÓN DE MERCANCIAS",
  icono: "🚚",
  elementosZonas: "Muelles de carga, rampas, suelos de recepción, andenes, puertas de acceso.",
  productoQuimicoUtil: "Desengrasante industrial, fregona industrial, manguera, cepillo, cubo.",
  instruccionesMetodo: "1. Barrer y retirar residuos. 2. Aplicar desengrasante con manguera. 3. Fregar con cepillo. 4. Aclarar con agua a presión. 5. Desinfectar superficies de contacto con producto.",

  checklists: {
    SEMANAL: [
      {
        elemento: "BUZON",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "ACERA",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Barrer y fregar suelos (≈100 ml en cubo de 10 l)",
        completado: false
      },
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
        elemento: "PUERTA MUELLE",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "PUERTA ALTILLO",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "PUERTA ENTRADA A PLANTA",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      }
    ],
    CADA_5_ANOS: [
      {
        elemento: "PAREDES",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "TECHO",
        producto: "CADA 5 AÑOS / ANTES SI SE CONSIDERA NECESARIO",
        instrucciones: "A concretAR por empresa especialista",
        completado: false
      },
      {
        elemento: "LUMINARIA",
        producto: "CADA 5 AÑOS / ANTES SI SE CONSIDERA NECESARIO",
        instrucciones: "A concretAR por empresa especialista",
        completado: false
      }
    ]
  }
};
