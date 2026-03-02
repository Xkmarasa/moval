/**
 * SALA DE MÁQUINAS - Checklist de Limpieza
 */
export const SALA_MAQUINAS = {
  id: "SALA_MAQUINAS",
  nombre: "SALA DE MÁQUINAS",
  icono: "⚙️",
  elementosZonas: "Suelos, maquinaria, cuadros eléctricos (exteriores), tuberías, desagües.",
  productoQuimicoUtil: "Desengrasante industrial, fregona, cubo, bayeta, cepillo.",
  instruccionesMetodo: "1. Apagar equipos según procedimiento. 2. Retirar residuos. 3. Aplicar desengrasante. 4. Fregar suelos y superficies accesibles. 5. Aclarar. 6. No mojar cuadros eléctricos.",

  checklists: {
    DIARIO: [],
    QUINCENAL: [],
    SEMANAL: [],
    MENSUAL: [],
    TRIMESTRAL: [],
    SEMESTRAL: [
      {
        elemento: "SUELOS Y ZOCALOS",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Barrer y fregar suelos (≈100 ml en cubo de 10 l)",
        completado: false
      },
      {
        elemento: "ESCALERA Y ACCESO",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "PUERTAS DE ACCESO",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "ARMARIOS ELECTRICOS",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "MANILLA DE LA LUZ",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "BARANDILLA ESCALERA",
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
