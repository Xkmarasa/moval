import ControlAguaForm from "./ControlAguaForm";

const fields = [
  {
    key: "temperaturaCalentador",
    label: "Temperatura calentador (≥60ºC)",
    placeholder: "Ej. 62",
    required: true,
  },
  {
    key: "cloroDeposito",
    label: "Cloro depósito (0,2-1 PPM)",
    placeholder: "Ej. 0,5",
    required: true,
  },
  {
    key: "phDeposito",
    label: "pH depósito (6,5-8,5)",
    placeholder: "Ej. 7,2",
    required: true,
  },
];

const ControlAguaDiario = (props) => (
  <ControlAguaForm
    {...props}
    config={{
      title: "Control Agua Diario",
      endpoint: "createControlAguaDiarioReport",
      tipoInforme: "CONTROL_AGUA_DIARIO",
      fields,
    }}
  />
);

export default ControlAguaDiario;





