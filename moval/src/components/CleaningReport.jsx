import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";
import { resizeSignatureCanvas, clearSignatureCanvas } from "../utils/signatureCanvas";

const CleaningReport = ({ onClose, user, apiBase, onNotify }) => {
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    controlSuperficies: false,
    desengrasantePorLitro: "",
    desinfectantePorLitro: "",
    phAclarado: "",
    phGrifo: "",
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
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleDefaultNumeric = (field, defaultValue) => {
    setFormData((prev) => {
      if (prev[field]) return prev;
      return {
        ...prev,
        [field]: defaultValue,
      };
    });
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fecha) newErrors.fecha = "La fecha es requerida";
    if (!formData.hora) newErrors.hora = "La hora es requerida";
    if (!formData.firmaNombreEmpleado) newErrors.firmaNombreEmpleado = "La firma (nombre del empleado) es requerida";
    if (!formData.firmaImagenBase64) newErrors.firmaImagenBase64 = "Debe dibujar la firma";

    // Validar campos numéricos
    const numericFields = [
      "desengrasantePorLitro",
      "desinfectantePorLitro",
      "phAclarado",
      "phGrifo",
    ];

    numericFields.forEach((field) => {
      if (formData[field] && isNaN(Number(formData[field]))) {
        newErrors[field] = "Debe ser un número válido";
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
    clearSignatureCanvas(canvasRef.current);
    setFormData((prev) => ({
      ...prev,
      firmaImagenBase64: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBase}/createCleaningReport`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: user?.usuario || user?.employee_id,
          fecha: formData.fecha,
          hora: formData.hora,
          controlSuperficies: formData.controlSuperficies,
          desengrasantePorLitro: formData.desengrasantePorLitro || null,
          desinfectantePorLitro: formData.desinfectantePorLitro || null,
          phAclarado: formData.phAclarado || null,
          phGrifo: formData.phGrifo || null,
          firmaNombreEmpleado: formData.firmaNombreEmpleado,
          firmaImagenBase64: formData.firmaImagenBase64,
        }),
      });

      let result;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error("Respuesta vacía del servidor");
        }
        result = JSON.parse(text);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error("Error al procesar la respuesta del servidor. Por favor, intente nuevamente.");
      }

      if (!response.ok) {
        throw new Error(result.message || result.error || `Error del servidor (${response.status})`);
      }

      notify("success", "Informe de Limpieza enviado correctamente. El informe ha sido guardado en la base de datos.");
      onClose();
    } catch (error) {
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        notify("error", "Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente.");
      } else {
        notify("error", `Error al enviar el formulario: ${error.message}`);
      }
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container">
        <div className="tool-registration-header">
          <h1>Informe de Limpieza</h1>
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
          {/* FECHA */}
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

          {/* HORA */}
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

          {/* CONTROL DE SUPERFICIES */}
          <div className="form-group">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                name="controlSuperficies"
                checked={formData.controlSuperficies}
                onChange={handleChange}
                style={{ width: "auto", cursor: "pointer" }}
              />
              <span>
                3. Control de superficies correcto
              </span>
            </label>
          </div>

          {/* DESENGRASANTE POR LITRO */}
          <div className="form-group">
            <label htmlFor="desengrasantePorLitro">
              4. Desengrasante por litro de agua
            </label>
            <input
              type="number"
              id="desengrasantePorLitro"
              name="desengrasantePorLitro"
              value={formData.desengrasantePorLitro}
              onChange={handleChange}
              step="0.01"
              placeholder="Ej: 2.5"
              className={errors.desengrasantePorLitro ? "error" : ""}
              onFocus={() => handleDefaultNumeric("desengrasantePorLitro", "0.05")}
            />
            {errors.desengrasantePorLitro && (
              <span className="error-message">{errors.desengrasantePorLitro}</span>
            )}
          </div>

          {/* DESINFECTANTE POR LITRO */}
          <div className="form-group">
            <label htmlFor="desinfectantePorLitro">
              5. Desinfectante por litro de agua
            </label>
            <input
              type="number"
              id="desinfectantePorLitro"
              name="desinfectantePorLitro"
              value={formData.desinfectantePorLitro}
              onChange={handleChange}
              step="0.01"
              placeholder="Ej: 1.5"
              className={errors.desinfectantePorLitro ? "error" : ""}
              onFocus={() => handleDefaultNumeric("desinfectantePorLitro", "0.01")}
            />
            {errors.desinfectantePorLitro && (
              <span className="error-message">{errors.desinfectantePorLitro}</span>
            )}
          </div>

          {/* PH DEL AGUA DEL ACLARADO */}
          <div className="form-group">
            <label htmlFor="phAclarado">
              6. PH del agua del aclarado
            </label>
            <input
              type="number"
              id="phAclarado"
              name="phAclarado"
              value={formData.phAclarado}
              onChange={handleChange}
              step="0.1"
              placeholder="Ej: 7.0"
              className={errors.phAclarado ? "error" : ""}
            />
            {errors.phAclarado && (
              <span className="error-message">{errors.phAclarado}</span>
            )}
          </div>

          {/* PH DEL GRIFO */}
          <div className="form-group">
            <label htmlFor="phGrifo">
              7. PH del grifo
            </label>
            <input
              type="number"
              id="phGrifo"
              name="phGrifo"
              value={formData.phGrifo}
              onChange={handleChange}
              step="0.1"
              placeholder="Ej: 7.2"
              className={errors.phGrifo ? "error" : ""}
            />
            {errors.phGrifo && (
              <span className="error-message">{errors.phGrifo}</span>
            )}
          </div>

          {/* FIRMA NOMBRE EMPLEADO + DIBUJO */}
          <div className="form-group form-group--signature">
            <label htmlFor="firmaNombreEmpleado">
              8. FIRMA (NOMBRE DEL EMPLEADO) <span className="required">*</span>
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

export default CleaningReport;


