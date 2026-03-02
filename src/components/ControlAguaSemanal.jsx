import ControlAguaForm from "./ControlAguaForm";

const fields = [
  {
    key: "turbidezCalentador",
    label: "Turbidez calentador (<4 UNF)",
    placeholder: "Ej. 3,2",
    required: true,
  },
  {
    key: "turbidezDeposito",
    label: "Turbidez depósito (<4 UNF)",
    placeholder: "Ej. 3,0",
    required: true,
  },
  {
    key: "purgaPuntos",
    label: "Purga puntos poco uso (Tº en purga ≥ 50 ºC)",
    placeholder: "Ej. 52",
    required: true,
  },
  {
    key: "turbidezPuntos",
    label: "Turbidez puntos terminales (<4 UNF)",
    placeholder: "Ej. 3,5",
    required: true,
  },
];

const ControlAguaSemanal = (props) => (
  <ControlAguaForm
    {...props}
    config={{
      title: "Control Agua Semanal",
      endpoint: "createControlAguaSemanalReport",
      tipoInforme: "CONTROL_AGUA_SEMANAL",
      fields,
    }}
  />
);

export default ControlAguaSemanal;





