import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";

const ControlResiduesReport = ({ onClose, user, apiBase, onNotify }) => {
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    paletsCarton: "",
    paletsPlastico: "",
    paletsFilm: "",
    nombreResponsable: "",
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
    if (!formData.paletsCarton) newErrors.paletsCarton = "Campo requerido";
    if (!formData.paletsPlastico) newErrors.paletsPlastico = "Campo requerido";
    if (!formData.paletsFilm) newErrors.paletsFilm = "Campo requerido";
    if (!formData.nombreResponsable) newErrors.nombreResponsable = "El nombre del responsable es requerido";
    if (!formData.firmaImagenBase64) newErrors.firmaImagenBase64 = "Debe dibujar la firma";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const resizeHandler = () => resizeCanvas();
    resizeCanvas();
    window.addEventListener("resize", resizeHandler);

    ctx.strokeStyle = "#012b5c";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setFormData((prev) => ({
        ...prev,
        firmaImagenBase64: "",
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
      paletsCarton: formData.paletsCarton,
      paletsPlastico: formData.paletsPlastico,
      paletsFilm: formData.paletsFilm,
      nombreResponsable: formData.nombreResponsable,
      firmaImagenBase64: formData.firmaImagenBase64,
    };

    try {
      const response = await fetch(`${apiBase}/createControlResiduesReport`, {
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

      notify("success", "Control de Residuos enviado correctamente. El informe ha sido guardado en la base de datos.");
      onClose();
    } catch (error) {
      notify("error", `Error al enviar el formulario: ${error.message}`);
      console.error("Error submitting control residuos report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container">
        <div className="tool-registration-header">
          <h1>Control de Residuos</h1>
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
            <label htmlFor="paletsCarton">
              3. NÚMERO DE PALETS DE CARTÓN <span className="required">*</span>
            </label>
            <input
              type="number"
              id="paletsCarton"
              name="paletsCarton"
              value={formData.paletsCarton}
              onChange={handleChange}
              min="0"
              className={errors.paletsCarton ? "error" : ""}
            />
            {errors.paletsCarton && <span className="error-message">{errors.paletsCarton}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="paletsPlastico">
              4. NÚMERO DE PALETS DE PLÁSTICO <span className="required">*</span>
            </label>
            <input
              type="number"
              id="paletsPlastico"
              name="paletsPlastico"
              value={formData.paletsPlastico}
              onChange={handleChange}
              min="0"
              className={errors.paletsPlastico ? "error" : ""}
            />
            {errors.paletsPlastico && <span className="error-message">{errors.paletsPlastico}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="paletsFilm">
              5. NÚMERO DE PALETS DE FILM <span className="required">*</span>
            </label>
            <input
              type="number"
              id="paletsFilm"
              name="paletsFilm"
              value={formData.paletsFilm}
              onChange={handleChange}
              min="0"
              className={errors.paletsFilm ? "error" : ""}
            />
            {errors.paletsFilm && <span className="error-message">{errors.paletsFilm}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="nombreResponsable">
              6. NOMBRE DEL RESPONSABLE <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nombreResponsable"
              name="nombreResponsable"
              value={formData.nombreResponsable}
              onChange={handleChange}
              className={errors.nombreResponsable ? "error" : ""}
            />
            {errors.nombreResponsable && <span className="error-message">{errors.nombreResponsable}</span>}
          </div>

          <div className="form-group">
            <label>
              7. FIRMA DEL RESPONSABLE <span className="required">*</span>
            </label>
            <div className={`signature-pad ${errors.firmaImagenBase64 ? "error" : ""}`}>
              <canvas ref={canvasRef} className="signature-canvas" />
            </div>
            {errors.firmaImagenBase64 && (
              <span className="error-message">{errors.firmaImagenBase64}</span>
            )}
            <button type="button" className="clear-signature" onClick={clearSignature}>
              Limpiar firma
            </button>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ControlResiduesReport;







