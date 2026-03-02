/**
 * ALTILLO - Checklist de Limpieza
 */
export const ALTILLO = {
  id: "ALTILLO",
  nombre: "ALTILLO",
  icono: "🪜",
  elementosZonas: "Suelos, barandillas, escaleras de acceso, estanterías, zonas de almacenamiento.",
  productoQuimicoUtil: "Desengrasante, desinfectante, fregona, cubo, bayeta, escoba.",
  instruccionesMetodo: "1. Retirar polvo y residuos. 2. Fregar suelos con desengrasante. 3. Limpiar barandillas y superficies. 4. Aclarar y desinfectar. 5. Verificar ausencia de humedad residual.",

  checklists: {
    SEMANAL: [],
    MENSUAL: [],
    TRIMESTRAL: [
      {
        elemento: "SUELOS Y ZOCALOS",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Barrer y fregar suelos (≈100 ml en cubo de 10 l)",
        completado: false
      },
      {
        elemento: "DESCALCIFICADOR",
        producto: "Sal",
        instrucciones: "Revisar que tenga suficiente sal y si no es así añadir",
        completado: false
      }
    ],
    ANUAL: [],
    CADA_5_ANOS: [
      {
        elemento: "ESTANTERIAS",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "TECHOS DE OFICINAS Y FALSOS TECHOS",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Barrer y fregar suelos (≈100 ml en cubo de 10 l)",
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
