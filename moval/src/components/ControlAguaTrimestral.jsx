import ControlAguaForm from "./ControlAguaForm";

const fields = [
  {
    key: "suciedadCorrosion",
    label: "Suciedad o corrosión?",
    type: "select",
    options: ["SI", "NO"],
    required: true,
  },
];

const ControlAguaTrimestral = (props) => (
  <ControlAguaForm
    {...props}
    config={{
      title: "Control Agua Trimestral",
      endpoint: "createControlAguaTrimestralReport",
      tipoInforme: "CONTROL_AGUA_TRIMESTRAL",
      fields,
    }}
  />
);

export default ControlAguaTrimestral;

