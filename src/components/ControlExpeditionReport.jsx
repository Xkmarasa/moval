import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";

const ControlExpeditionReport = ({ onClose, user, apiBase, onNotify }) => {
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    producto: "",
    lote: "",
    numeroPalet: "",
    cajasSueltas: "",
    paletIntegro: "",
    flejadoOK: "",
    etiquetaCorrecta: "",
    conteoCorrecto: "",
    responsable: "",
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
    if (!formData.producto) newErrors.producto = "El producto es requerido";
    if (!formData.lote) newErrors.lote = "El lote es requerido";
    if (!formData.numeroPalet) newErrors.numeroPalet = "El número de palet es requerido";
    if (!formData.paletIntegro) newErrors.paletIntegro = "Campo requerido";
    if (!formData.flejadoOK) newErrors.flejadoOK = "Campo requerido";
    if (!formData.etiquetaCorrecta) newErrors.etiquetaCorrecta = "Campo requerido";
    if (!formData.conteoCorrecto) newErrors.conteoCorrecto = "Campo requerido";
    if (!formData.responsable) newErrors.responsable = "El responsable es requerido";
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
      producto: formData.producto,
      lote: formData.lote,
      numeroPalet: formData.numeroPalet,
      cajasSueltas: formData.cajasSueltas,
      paletIntegro: formData.paletIntegro,
      flejadoOK: formData.flejadoOK,
      etiquetaCorrecta: formData.etiquetaCorrecta,
      conteoCorrecto: formData.conteoCorrecto,
      responsable: formData.responsable,
      firmaImagenBase64: formData.firmaImagenBase64,
    };

    try {
      const response = await fetch(`${apiBase}/createControlExpeditionReport`, {
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

      notify("success", "Control de expedición enviado correctamente. El informe ha sido guardado en la base de datos.");
      onClose();
    } catch (error) {
      notify("error", `Error al enviar el formulario: ${error.message}`);
      console.error("Error submitting control expedition report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container">
        <div className="tool-registration-header">
          <h1>Control de expedición</h1>
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
            <label htmlFor="producto">
              3. PRODUCTO <span className="required">*</span>
            </label>
            <input
              type="text"
              id="producto"
              name="producto"
              value={formData.producto}
              onChange={handleChange}
              className={errors.producto ? "error" : ""}
            />
            {errors.producto && <span className="error-message">{errors.producto}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="lote">
              4. LOTE <span className="required">*</span>
            </label>
            <input
              type="text"
              id="lote"
              name="lote"
              value={formData.lote}
              onChange={handleChange}
              className={errors.lote ? "error" : ""}
            />
            {errors.lote && <span className="error-message">{errors.lote}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="numeroPalet">
              5. NÚMERO DE PALET <span className="required">*</span>
            </label>
            <input
              type="number"
              id="numeroPalet"
              name="numeroPalet"
              value={formData.numeroPalet}
              onChange={handleChange}
              className={errors.numeroPalet ? "error" : ""}
            />
            {errors.numeroPalet && <span className="error-message">{errors.numeroPalet}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="cajasSueltas">
              Cajas sueltas (picos que no van paletizados)
            </label>
            <input
              type="number"
              id="cajasSueltas"
              name="cajasSueltas"
              value={formData.cajasSueltas}
              onChange={handleChange}
              className={errors.cajasSueltas ? "error" : ""}
            />
            {errors.cajasSueltas && <span className="error-message">{errors.cajasSueltas}</span>}
          </div>

          <div className="form-group">
            <label>
              6. PALET ÍNTEGRO <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["SI", "NO"].map((val) => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    name="paletIntegro"
                    value={val}
                    checked={formData.paletIntegro === val}
                    onChange={handleChange}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.paletIntegro && <span className="error-message">{errors.paletIntegro}</span>}
          </div>

          <div className="form-group">
            <label>
              7. FLEJADO OK <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["SI", "NO"].map((val) => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    name="flejadoOK"
                    value={val}
                    checked={formData.flejadoOK === val}
                    onChange={handleChange}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.flejadoOK && <span className="error-message">{errors.flejadoOK}</span>}
          </div>

          <div className="form-group">
            <label>
              8. ETIQUETA CORRECTA <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["SI", "NO"].map((val) => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    name="etiquetaCorrecta"
                    value={val}
                    checked={formData.etiquetaCorrecta === val}
                    onChange={handleChange}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.etiquetaCorrecta && <span className="error-message">{errors.etiquetaCorrecta}</span>}
          </div>

          <div className="form-group">
            <label>
              9. CONTEO CORRECTO <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["SI", "NO"].map((val) => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    name="conteoCorrecto"
                    value={val}
                    checked={formData.conteoCorrecto === val}
                    onChange={handleChange}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.conteoCorrecto && <span className="error-message">{errors.conteoCorrecto}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="responsable">
              10. RESPONSABLE <span className="required">*</span>
            </label>
            <input
              type="text"
              id="responsable"
              name="responsable"
              value={formData.responsable}
              onChange={handleChange}
              className={errors.responsable ? "error" : ""}
            />
            {errors.responsable && <span className="error-message">{errors.responsable}</span>}
          </div>

          <div className="form-group form-group--signature">
            <label>
              11. FIRMA DEL RESPONSABLE <span className="required">*</span>
            </label>
            <div className="signature-container">
              <canvas ref={canvasRef} className="signature-canvas"></canvas>
              <p className="signature-hint">Dibuja la firma del responsable en el recuadro</p>
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

export default ControlExpeditionReport;

