import { useEffect, useRef, useState } from "react";
import { resizeSignatureCanvas, clearSignatureCanvas } from "../utils/signatureCanvas";
import "./ToolRegistration.css";

const ControlAguaForm = ({ onClose, user, apiBase, onNotify, config }) => {
  const { title, endpoint, tipoInforme, fields } = config;
  const [formData, setFormData] = useState(() => {
    const base = {
      fecha: "",
      hora: "",
      firmaNombreEmpleado: "",
      firmaImagenBase64: "",
    };
    fields.forEach((field) => {
      base[field.key] = "";
    });
    return base;
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;
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
    if (!formData.firmaNombreEmpleado) {
      newErrors.firmaNombreEmpleado = "La firma (nombre del empleado) es requerida";
    }
    if (!formData.firmaImagenBase64) {
      newErrors.firmaImagenBase64 = "Debe dibujar la firma";
    }

    fields.forEach((field) => {
      if (field.required && !formData[field.key]) {
        newErrors[field.key] = "Este campo es requerido";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx = resizeSignatureCanvas(canvas);
    const resizeHandler = () => {
      ctx = resizeSignatureCanvas(canvas);
    };
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
      clearSignatureCanvas(canvas);
      setFormData((prev) => ({
        ...prev,
        firmaImagenBase64: "",
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const employeeId = user?.usuario || user?.employee_id || user?.nombre;
    if (!employeeId) {
      notify(
        "error",
        "No se pudo identificar al usuario. Por favor, cierra sesión e inicia sesión nuevamente.",
      );
      return;
    }

    setIsSubmitting(true);

    const payload = {
      employee_id: employeeId,
      fecha: formData.fecha,
      hora: formData.hora,
      tipoInforme,
      firmaNombreEmpleado: formData.firmaNombreEmpleado,
      firmaImagenBase64: formData.firmaImagenBase64,
    };
    fields.forEach((field) => {
      payload[field.key] = formData[field.key];
    });

    try {
      const response = await fetch(`${apiBase}/${endpoint}`, {
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

      notify("success", `${title} enviado correctamente. El informe ha sido guardado en la base de datos.`);
      onClose();
    } catch (error) {
      notify("error", `Error al enviar el formulario: ${error.message}`);
      console.error("Error submitting control agua report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container">
        <div className="tool-registration-header">
          <h1>{title}</h1>
          <button type="button" className="tool-registration-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="tool-registration-form" onSubmit={handleSubmit}>
          <div className="control-agua-fields">
            <div className="form-group">
              <label htmlFor="fecha">
                Fecha <span className="required">*</span>
              </label>
              <input
                type="date"
                id="fecha"
                name="fecha"
                value={formData.fecha}
                onChange={handleInputChange}
                className={errors.fecha ? "error" : ""}
              />
              {errors.fecha && <span className="error-message">{errors.fecha}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="hora">
                Hora <span className="required">*</span>
              </label>
              <input
                type="time"
                id="hora"
                name="hora"
                value={formData.hora}
                onChange={handleInputChange}
                className={errors.hora ? "error" : ""}
              />
              {errors.hora && <span className="error-message">{errors.hora}</span>}
            </div>

            {fields.map((field) => (
              <div className="form-group" key={field.key}>
                <label htmlFor={field.key}>
                  {field.label} {field.required && <span className="required">*</span>}
                </label>
                {field.type === "select" ? (
                  <select
                    id={field.key}
                    name={field.key}
                    value={formData[field.key]}
                    onChange={handleInputChange}
                    className={errors[field.key] ? "error" : ""}
                  >
                    <option value="">Seleccione</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    id={field.key}
                    name={field.key}
                    value={formData[field.key]}
                    onChange={handleInputChange}
                    placeholder={field.placeholder || ""}
                    className={errors[field.key] ? "error" : ""}
                  />
                )}
                {errors[field.key] && <span className="error-message">{errors[field.key]}</span>}
              </div>
            ))}
          </div>

          <div className="form-group form-group--signature">
            <label htmlFor="firmaNombreEmpleado">
              Firma (nombre del empleado) <span className="required">*</span>
            </label>
            <div className="signature-container">
              <div className="signature-name">
                <input
                  type="text"
                  id="firmaNombreEmpleado"
                  name="firmaNombreEmpleado"
                  value={formData.firmaNombreEmpleado}
                  onChange={handleInputChange}
                  placeholder="Escriba el nombre del empleado que firma"
                  className={errors.firmaNombreEmpleado ? "error" : ""}
                />
                {errors.firmaNombreEmpleado && (
                  <span className="error-message">{errors.firmaNombreEmpleado}</span>
                )}
              </div>
              <canvas ref={canvasRef} className="signature-canvas"></canvas>
              <p className="signature-hint">Dibuja tu firma en el recuadro</p>
              <div className="signature-controls">
                <button type="button" className="dk-btn dk-btn--ghost" onClick={clearSignature}>
                  Limpiar firma
                </button>
              </div>
              {errors.firmaImagenBase64 && (
                <span className="error-message">{errors.firmaImagenBase64}</span>
              )}
            </div>
          </div>

          <button type="submit" className="dk-btn dk-btn--primary" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar formulario"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ControlAguaForm;

