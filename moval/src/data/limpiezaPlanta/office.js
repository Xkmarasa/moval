/**
 * OFFICE - Checklist de Limpieza
 */
export const OFFICE = {
  id: "OFFICE",
  nombre: "OFFICE",
  icono: "💼",
  elementosZonas: "Suelos, mesas, sillas, encimeras, ordenador, wc, ducha, zona de descanso.",
  productoQuimicoUtil: "Lejía con detergente, limpiador higienizante PQ-80, amoniaco, bayeta, fregona, cubo.",
  instruccionesMetodo: "1. Retirar objetos de superficies. 2. Limpiar encimeras y electrodomésticos. 3. Fregar suelos. 4. Desinfectar superficies de contacto. 5. Ventilar.",

  checklists: {
    SEMANAL: [],
    QUINCENAL: [
      {
        elemento: "SUELOS Y ZOCALOS",
        producto: "LEJIA CON DETERGENTE",
        instrucciones: "Barrer y fregar suelos (≈100 ml en cubo de 10 l)",
        completado: false
      },
      {
        elemento: "MESA",
        producto: "AGUA Y LAVAVAJILLAS PQ-21",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "BANCO DE COCINA",
        producto: "AGUA Y LAVAVAJILLAS PQ-21",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "VITROCERAMICA",
        producto: "AGUA Y LAVAVAJILLAS PQ-21",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "PILA",
        producto: "AGUA Y LIMPIADOR HIGIENIZANTE PQ-80",
        instrucciones: "Enjabonar con un estropajo y aclarar con una bayeta humedecida",
        completado: false
      },
      {
        elemento: "MICROONDAS",
        producto: "AGUA Y LAVAVAJILLAS PQ-21",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "WC",
        producto: "LIMPIADOR HIGIENIZANTE PQ-80",
        instrucciones: "Rociar el interior del inodoro",
        completado: false
      },
      {
        elemento: "PILA (BAÑO)",
        producto: "AGUA Y LIMPIADOR HIGIENIZANTE PQ-80",
        instrucciones: "Enjabonar con un estropajo y aclarar con una bayeta humedecida",
        completado: false
      },
      {
        elemento: "PLATO DE DUCHA",
        producto: "AGUA Y LIMPIADOR HIGIENIZANTE PQ-80",
        instrucciones: "Enjabonar con un estropajo y aclarar con una bayeta humedecida",
        completado: false
      },
      {
        elemento: "MANIVELAS DE LA LUZ",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "PUERTA",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "EXTRACTOR",
        producto: "AGUA Y LAVAVAJILLAS PQ-21",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "TOALLERO",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "ESPEJO",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "PORTAROLLOS",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "SECAMANOS",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      }
    ],
    MENSUAL: [
      {
        elemento: "VENTANAS",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "ARMARIO WIFFI",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "ARMARIO ALARMA",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "SILLAS",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "CUBO",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "ARMARIO RECEPCION",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "HORNO",
        producto: "DESENGRAS FOOD",
        instrucciones: "Pulverizar el producto sobre la superficie y aclarar con agua limpia",
        completado: false
      },
      {
        elemento: "MUEBLES DE COCINA",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
        completado: false
      },
      {
        elemento: "MAMPARA",
        producto: "AMONIACO",
        instrucciones: "Utilizar una bayeta humedecida en un cubo de agua caliente y un 2,5% de producto",
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
        producto: "CADA 5 AÑOS / ANTES SI SE CONSIDERA NECESARIO",
        instrucciones: "A concretAR por empresa especialista",
        completado: false
      }
    ]
  }
};
