import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";
import { resizeSignatureCanvas, clearSignatureCanvas } from "../utils/signatureCanvas";

const InitialReport = ({ onClose, user, apiBase, onNotify }) => {
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    instalacionesLimpias: "",
    manipuladoresUniformados: "",
    peloProtegido: "",
    unasLimpias: "",
    elementosTamiz: "",
    calibracionPHMetro: "",
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

  const checklistItems = [
    { key: "instalacionesLimpias", label: "Instalaciones limpias" },
    { key: "manipuladoresUniformados", label: "Manipuladores correctamente uniformados" },
    { key: "peloProtegido", label: "Pelo correctamente protegido por gorro" },
    { key: "unasLimpias", label: "Uñas limpias y sin esmalte" },
    { key: "elementosTamiz", label: "Elementos extraños en el tamiz del ojo" },
    { key: "calibracionPHMetro", label: "Calibración del PHMetro (PCC2)" },
  ];

  const handleInputChange = (e) => {
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
    if (!formData.firmaNombreEmpleado) newErrors.firmaNombreEmpleado = "La firma (nombre del empleado) es requerida";
    if (!formData.firmaImagenBase64) newErrors.firmaImagenBase64 = "Debe dibujar la firma";
    
    checklistItems.forEach((item) => {
      if (!formData[item.key]) {
        newErrors[item.key] = "Este campo es requerido";
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

    // Validar que tenemos los datos del usuario
    const employeeId = user?.usuario || user?.employee_id || user?.nombre;
    if (!employeeId) {
      notify("error", "No se pudo identificar al usuario. Por favor, cierra sesión e inicia sesión nuevamente.");
      console.error("User object:", user);
      return;
    }

    // Validar que fecha y hora estén presentes
    if (!formData.fecha || !formData.hora) {
      notify("error", "Por favor completa la fecha y la hora.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      employee_id: employeeId,
      fecha: formData.fecha,
      hora: formData.hora,
      tipoInforme: "INICIAL",
      instalacionesLimpias: formData.instalacionesLimpias,
      manipuladoresUniformados: formData.manipuladoresUniformados,
      peloProtegido: formData.peloProtegido,
      unasLimpias: formData.unasLimpias,
      elementosTamiz: formData.elementosTamiz,
      calibracionPHMetro: formData.calibracionPHMetro,
      firmaNombreEmpleado: formData.firmaNombreEmpleado,
      firmaImagenBase64: formData.firmaImagenBase64,
    };

    console.log("Enviando datos:", payload);

    try {
      const response = await fetch(`${apiBase}/createInitialReport`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok && response.status === 404) {
        throw new Error("La función createInitialReport no está disponible. Por favor, despliega las funciones actualizadas.");
      }

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

      notify("success", "Informe Inicial enviado correctamente. El informe ha sido guardado en la base de datos.");
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
          <h1>Informe Inicial</h1>
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
              onChange={handleInputChange}
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
              onChange={handleInputChange}
              className={errors.hora ? "error" : ""}
            />
            {errors.hora && <span className="error-message">{errors.hora}</span>}
          </div>

          {/* CHECKLIST */}
          <div className="form-group">
            <label>
              3. CHECKLIST <span className="required">*</span>
            </label>
            <div className="checklist-container" style={{ marginTop: "1rem" }}>
              {checklistItems.map((item, index) => (
                <div key={item.key} className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    {index + 1}. {item.label}
                  </label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name={item.key}
                        value="SI"
                        checked={formData[item.key] === "SI"}
                        onChange={handleInputChange}
                      />
                      <span>Sí</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name={item.key}
                        value="NO"
                        checked={formData[item.key] === "NO"}
                        onChange={handleInputChange}
                      />
                      <span>No</span>
                    </label>
                  </div>
                  {errors[item.key] && <span className="error-message">{errors[item.key]}</span>}
                </div>
              ))}
            </div>
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
                  onChange={handleInputChange}
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

export default InitialReport;

