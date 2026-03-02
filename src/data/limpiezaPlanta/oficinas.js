/**
 * OFICINAS - Checklist de Limpieza
 */
export const OFICINAS = {
  id: "OFICINAS",
  nombre: "OFICINAS",
  icono: "📋",
  elementosZonas: "Suelos, escritorios, sillas, archivadores, ventanas, puertas.",
  productoQuimicoUtil: "Detergente neutro, desinfectante, bayeta, fregona, cubo, aspiradora.",
  instruccionesMetodo: "1. Aspirar o barrer suelos. 2. Limpiar superficies con detergente. 3. Fregar suelos. 4. Desinfectar teclados, teléfonos y superficies de contacto.",

  checklists: {
    QUINCENAL: [
      {
        elemento: "SUELOS Y ZOCALOS",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Barrer y fregar suelos (≈100 ml en cubo de 10 l)",
        completado: false
      },
      {
        elemento: "PUERTA",
        producto: "AGUA Y AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "VENTANA",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "MESA DE TRABAJO",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "ORDENADOR",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "IMPRESORA",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "GABETAS",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "ARMARIO ARCHIVADOR",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "MANIVELA LUZ",
        producto: "",
        instrucciones: "",
        completado: false
      }
    ],
    SEMANAL: [],
    MENSUAL: [],
    TRIMESTRAL: [],
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
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      }
    ]
  }
};
