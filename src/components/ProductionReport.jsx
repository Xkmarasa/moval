import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";

const ProductionReport = ({ onClose, user, apiBase, onNotify }) => {
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    tipoProducto: "",
    numeroCampana: "",
    color: "",
    olor: "",
    sabor: "",
    textura: "",
    phPcc2: "",
    firmaNombreEmpleado: "",
    firmaImagenBase64: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const DRAFT_KEY = `productionReportDraft_${user?.usuario || user?.employee_id}`;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      setFormData(JSON.parse(savedDraft));
    }
  }, [DRAFT_KEY]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  }, [formData, DRAFT_KEY]);

  const notify = (type, message) => {
    if (onNotify) {
      onNotify(type, message);
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    notify("info", "Borrador guardado correctamente.");
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
    if (!formData.firmaNombreEmpleado) newErrors.firmaNombreEmpleado = "La firma (nombre del empleado) es requerida";
    if (!formData.firmaImagenBase64) newErrors.firmaImagenBase64 = "Debe dibujar la firma";
    if (!formData.tipoProducto) newErrors.tipoProducto = "Debe seleccionar el producto";
    if (!formData.numeroCampana) {
      newErrors.numeroCampana = "El número de campaña es requerido";
    } else if (isNaN(Number(formData.numeroCampana))) {
      newErrors.numeroCampana = "Debe ser un número válido";
    }

    ["color", "olor", "sabor", "textura"].forEach((key) => {
      if (!formData[key]) {
        newErrors[key] = "Este campo es requerido";
      }
    });

    if (!formData.phPcc2) {
      newErrors.phPcc2 = "El valor de pH es requerido";
    } else if (isNaN(Number(formData.phPcc2))) {
      newErrors.phPcc2 = "Debe ser un número válido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      tipoProducto: formData.tipoProducto,
      numeroCampana: Number(formData.numeroCampana),
      color: formData.color,
      olor: formData.olor,
      sabor: formData.sabor,
      textura: formData.textura,
      phPcc2: Number(formData.phPcc2),
      firmaNombreEmpleado: formData.firmaNombreEmpleado,
      firmaImagenBase64: formData.firmaImagenBase64,
      checklistComponentes: {
        aceite: formData.aceite || "",
        huevo: formData.huevo || "",
        yema: formData.yema || "",
        ajo: formData.ajo || "",
        sal: formData.sal || "",
        limon: formData.limon || "",
        sorbato: formData.sorbato || "",
        xantana: formData.xantana || "",
        colorante: formData.colorante || "",
        benzoato: formData.benzoato || "",
      },
    };

    try {
      const response = await fetch(`${apiBase}/createProductionReport`, {
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

      notify("success", "Informe de Producción enviado correctamente. El informe ha sido guardado en la base de datos.");
      localStorage.removeItem(DRAFT_KEY);
      onClose();
    } catch (error) {
      notify("error", `Error al enviar el formulario: ${error.message}`);
      console.error("Error submitting production report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSelect = (name, label) => (
    <div className="form-group">
      <label htmlFor={name}>
        {label} <span className="required">*</span>
      </label>
      <select
        id={name}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        className={errors[name] ? "error" : ""}
      >
        <option value="">Selecciona una opción</option>
        <option value="EXCELENTE">Excelente</option>
        <option value="ACEPTABLE">Aceptable</option>
        <option value="NO_ACEPTABLE">No aceptable</option>
      </select>
      {errors[name] && <span className="error-message">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container">
        <div className="tool-registration-header">
          <h1>Informe de Producción</h1>
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
            <label>3. CONTROL ORGANOLEPTICO</label>
          </div>

          <div className="two-column">
            {renderSelect("color", "Color")}
            {renderSelect("olor", "Olor")}
          </div>
          <div className="two-column">
            {renderSelect("sabor", "Sabor")}
            {renderSelect("textura", "Textura")}
          </div>

          <div className="form-group">
            <label htmlFor="phPcc2">
              4. pH (PCC2) <span className="required">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              id="phPcc2"
              name="phPcc2"
              value={formData.phPcc2}
              onChange={handleChange}
              className={errors.phPcc2 ? "error" : ""}
            />
            {errors.phPcc2 && <span className="error-message">{errors.phPcc2}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="tipoProducto">
              5. PRODUCTO <span className="required">*</span>
            </label>
            <select
              id="tipoProducto"
              name="tipoProducto"
              value={formData.tipoProducto}
              onChange={handleChange}
              className={errors.tipoProducto ? "error" : ""}
            >
              <option value="">Selecciona una opción</option>
              <option value="ALLIOLI">Allioli</option>
              <option value="MAYONESA">Mayonesa</option>
            </select>
            {errors.tipoProducto && <span className="error-message">{errors.tipoProducto}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="numeroCampana">
              6. NÚMERO DE CAMPAÑA <span className="required">*</span>
            </label>
            <input
              type="number"
              id="numeroCampana"
              name="numeroCampana"
              value={formData.numeroCampana}
              onChange={handleChange}
              className={errors.numeroCampana ? "error" : ""}
            />
            {errors.numeroCampana && <span className="error-message">{errors.numeroCampana}</span>}
          </div>

          <div className="form-group">
            <label>7. CHECKLIST COMPONENTES <span className="required">*</span></label>
            <div className="checklist-container" style={{ marginTop: "1rem" }}>
              {[
                { key: "aceite", label: "Aceite" },
                { key: "huevo", label: "Huevo" },
                { key: "yema", label: "Yema" },
                { key: "ajo", label: "Ajo" },
                { key: "sal", label: "Sal" },
                { key: "limon", label: "Limón" },
                { key: "sorbato", label: "Sorbato" },
                { key: "xantana", label: "Xantana" },
                { key: "colorante", label: "Colorante" },
                { key: "benzoato", label: "Benzoato" },
              ].map((item) => (
                <div key={item.key} className="form-group" style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    {item.label}
                  </label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name={item.key}
                        value="SI"
                        checked={formData[item.key] === "SI"}
                        onChange={handleChange}
                      />
                      <span>Sí</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name={item.key}
                        value="NO"
                        checked={formData[item.key] === "NO"}
                        onChange={handleChange}
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
              type="button"
              className="dk-btn dk-btn--secondary"
              onClick={handleSaveDraft}
            >
              Guardar Borrador
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

export default ProductionReport;
