import ControlAguaForm from "./ControlAguaForm";

const fields = [
  {
    key: "suciedadCorrosion",
    label: "Suciedad o corrosión?",
    type: "select",
    options: ["SI", "NO"],
    required: true,
  },
  {
    key: "tempFria",
    label: "Tº < 20 ºC (fría)",
    placeholder: "Ej. 18",
    required: true,
  },
  {
    key: "tempCaliente",
    label: "Tº ≥ 50 ºC (caliente)",
    placeholder: "Ej. 55",
    required: true,
  },
  {
    key: "cloroPuntos",
    label: "Cloro 0,2-1",
    placeholder: "Ej. 0,7",
    required: true,
  },
];

const ControlAguaMensual = (props) => (
  <ControlAguaForm
    {...props}
    config={{
      title: "Control Agua Mensual (Mediciones en puntos terminales)",
      endpoint: "createControlAguaMensualReport",
      tipoInforme: "CONTROL_AGUA_MENSUAL",
      fields,
    }}
  />
);

export default ControlAguaMensual;





