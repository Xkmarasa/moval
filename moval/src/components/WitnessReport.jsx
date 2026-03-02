import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";
import { resizeSignatureCanvas, clearSignatureCanvas } from "../utils/signatureCanvas";

const WitnessReport = ({ onClose, user, apiBase, onNotify }) => {
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    tipoTestigo: [],
    firmaNombreEmpleado: "",
    firmaImagenBase64: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const notify = (type, message) => {
    if (onNotify) {
      onNotify(type, message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fecha) newErrors.fecha = "La fecha es requerida";
    if (!formData.hora) newErrors.hora = "La hora es requerida";
    if (!Array.isArray(formData.tipoTestigo) || formData.tipoTestigo.length === 0) {
      newErrors.tipoTestigo = "El tipo de testigo es requerido";
    }
    if (!formData.firmaNombreEmpleado) newErrors.firmaNombreEmpleado = "La firma (nombre del empleado) es requerida";
    if (!formData.firmaImagenBase64) newErrors.firmaImagenBase64 = "Debe dibujar la firma";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx = resizeSignatureCanvas(canvas);
    const resizeHandler = () => { ctx = resizeSignatureCanvas(canvas); };
    resizeHandler();
    window.addEventListener("resize", resizeHandler);

    const getCoordinates = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (e.touches && e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const startDrawing = (e) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const coords = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    };

    const draw = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const coords = getCoordinates(e);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    };

    const stopDrawing = (e) => {
      if (e) e.preventDefault();
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        const dataUrl = canvas.toDataURL("image/png");
        setFormData((prev) => ({
          ...prev,
          firmaImagenBase64: dataUrl,
        }));
        if (errors.firmaImagenBase64) {
          setErrors((prev) => ({
            ...prev,
            firmaImagenBase64: "",
          }));
        }
      }
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing, { passive: false });

    return () => {
      window.removeEventListener("resize", resizeHandler);
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseleave", stopDrawing);
      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDrawing);
    };
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      setFormData((prev) => ({
        ...prev,
        firmaImagenBase64: "",
      }));
    }
  };

  const toggleTestigoOption = (value) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.tipoTestigo) ? prev.tipoTestigo : [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return {
        ...prev,
        tipoTestigo: next,
      };
    });
    if (errors.tipoTestigo) {
      setErrors((prev) => ({
        ...prev,
        tipoTestigo: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const payload = {
      employee_id: user?.usuario || user?.employee_id,
      fecha: formData.fecha,
      hora: formData.hora,
      tipoTestigo: formData.tipoTestigo,
      firmaNombreEmpleado: formData.firmaNombreEmpleado,
      firmaImagenBase64: formData.firmaImagenBase64,
    };

    try {
      const response = await fetch(`${apiBase}/createWitnessReport`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let result = {};
      if (text) {
        try {
          result = JSON.parse(text);
        } catch (parseError) {
          console.error("Error parsing response:", parseError, text);
        }
      }

      if (!response.ok) {
        throw new Error(
          result.message || result.error || `Error del servidor (${response.status})`,
        );
      }

      notify("success", "Registro de Testigos enviado correctamente. El informe ha sido guardado en la base de datos.");
      onClose();
    } catch (error) {
      notify("error", `Error al enviar el formulario: ${error.message}`);
      console.error("Error submitting witness report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container">
        <div className="tool-registration-header">
          <h1>Registro de Testigos</h1>
          <button
            type="button"
            className="tool-registration-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tool-registration-form">
          <div className="form-group">
            <label htmlFor="fecha">
              1. FECHA <span className="required">*</span>
            </label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              className={errors.fecha ? "error" : ""}
            />
            {errors.fecha && <span className="error-message">{errors.fecha}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hora">
              2. HORA <span className="required">*</span>
            </label>
            <input
              type="time"
              id="hora"
              name="hora"
              value={formData.hora}
              onChange={handleChange}
              className={errors.hora ? "error" : ""}
            />
            {errors.hora && <span className="error-message">{errors.hora}</span>}
          </div>

          <div className="form-group">
            <label>
              3. TIPO DE TESTIGO <span className="required">*</span>
            </label>
            <div className="radio-group">
              {[
                { value: "FE", label: "Fe" },
                { value: "INOX", label: "INOX" },
                { value: "NO_INOX", label: "No INOX" },
              ].map((opt) => (
                <label key={opt.value} className="radio-label">
                  <input
                    type="checkbox"
                    name={`tipoTestigo_${opt.value}`}
                    value={opt.value}
                    checked={formData.tipoTestigo.includes(opt.value)}
                    onChange={() => toggleTestigoOption(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            {errors.tipoTestigo && <span className="error-message">{errors.tipoTestigo}</span>}
          </div>

          {/* FIRMA NOMBRE EMPLEADO + DIBUJO */}
          <div className="form-group form-group--signature">
            <label htmlFor="firmaNombreEmpleado">
              4. FIRMA (NOMBRE DEL EMPLEADO) <span className="required">*</span>
            </label>
            <div className="signature-container">
              <div className="signature-name">
                <input
                  type="text"
                  id="firmaNombreEmpleado"
                  name="firmaNombreEmpleado"
                  value={formData.firmaNombreEmpleado}
                  onChange={handleChange}
                  placeholder="Escriba el nombre del empleado que firma"
                  className={errors.firmaNombreEmpleado ? "error" : ""}
                />
                {errors.firmaNombreEmpleado && (
                  <span className="error-message">{errors.firmaNombreEmpleado}</span>
                )}
              </div>
              <canvas
                ref={canvasRef}
                className="signature-canvas"
              ></canvas>
              <p className="signature-hint">Dibuja tu firma en el recuadro</p>
              <div className="signature-controls">
                <button
                  type="button"
                  className="dk-btn dk-btn--ghost"
                  onClick={clearSignature}
                >
                  Limpiar
                </button>
              </div>
              {errors.firmaImagenBase64 && (
                <span className="error-message">{errors.firmaImagenBase64}</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="dk-btn dk-btn--ghost"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="dk-btn dk-btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WitnessReport;



