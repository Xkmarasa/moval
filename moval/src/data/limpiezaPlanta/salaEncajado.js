/**
 * SALA ENCAJADO - Checklist de Limpieza
 */
export const SALA_ENCAJADO = {
  id: "SALA_ENCAJADO",
  nombre: "SALA ENCAJADO",
  icono: "📦",
  elementosZonas: "Mesas de encajado, cintas transportadoras, suelos, estanterías de cajas.",
  productoQuimicoUtil: "Desengrasante, desinfectante, fregona, bayeta, cubo, cepillo.",
  instruccionesMetodo: "1. Retirar cajas y material. 2. Limpiar cintas y mesas. 3. Fregar suelos. 4. Desinfectar superficies de contacto. 5. Verificar ausencia de residuos.",

  checklists: {
    SEMANAL: [],
    MENSUAL: [
      {
        elemento: "SUELO",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Fregado de suelos (≈100 ml en cubo de 10 l)",
        completado: false
      },
      {
        elemento: "PUERTAS DE ACCESO",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
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
