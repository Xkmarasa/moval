/**
 * SALA DE PESAJE - LABORATORIO - Checklist de Limpieza
 */
export const SALA_PESAJE_LABORATORIO = {
  id: "SALA_PESAJE_LABORATORIO",
  nombre: "SALA DE PESAJE - LABORATORIO",
  icono: "⚖️",
  elementosZonas: "Balanza, mesas de trabajo, suelos, armarios, utensilios de medición.",
  productoQuimicoUtil: "Detergente neutro, desinfectante, alcohol 70%, bayeta, fregona.",
  instruccionesMetodo: "1. Limpiar balanza y superficies con detergente. 2. Desinfectar con alcohol 70%. 3. Fregar suelos. 4. Verificar calibración de equipos tras limpieza.",

  checklists: {
    DIARIO: [
      {
        elemento: "MAQUINA PICADORA DE AJOS",
        producto: "DESENGRAS FOOD",
        instrucciones: "Eliminar todos los restos, pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "SUELOS Y ZOCALOS",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Barrer y fregar suelos (≈100 ml en cubo de 10 l)",
        completado: false
      },
      {
        elemento: "CUBOS Y UTENSILIOS",
        producto: "PQ24",
        instrucciones: "Bajo el grifo con el desengrasante y un cepillo",
        completado: false
      },
      {
        elemento: "BASCULA",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "ORDENADOR Y PHMETRO",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "BANCO DE INOX",
        producto: "",
        instrucciones: "",
        completado: false
      }
    ],
    QUINCENAL: [],
    SEMANAL: [],
    MENSUAL: [
      {
        elemento: "PUERTAS DE ACCESO",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "ESTANTERIAS",
        producto: "",
        instrucciones: "",
        completado: false
      },
      {
        elemento: "MANILLAS DE LA LUZ",
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
