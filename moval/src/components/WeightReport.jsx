
import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";

const TOTAL_PESOS = 80;
const createSnapshot = ({
  fechaValue = "",
  horaValue = "",
  envaseValue = "",
  pesosValue = [],
  firmaNombreValue = "",
  firmaImagenValue = "",
} = {}) => ({
  fecha: fechaValue || "",
  hora: horaValue || "",
  envaseCantidad: envaseValue || "",
  pesos: Array.isArray(pesosValue)
    ? pesosValue.map((valor) => (valor === null || valor === undefined ? "" : String(valor)))
    : [],
  firmaNombreEmpleado: firmaNombreValue || "",
  firmaImagenBase64: firmaImagenValue || "",
});

const WeightReport = ({ onClose, user, apiBase, pendingReport, onDraftStateChange, onNotify, onConfirm }) => {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [envaseCantidad, setEnvaseCantidad] = useState("");
  const [pesos, setPesos] = useState(() =>
    Array.from({ length: TOTAL_PESOS }, () => ""),
  );
  const [draftId, setDraftId] = useState(null);
  const [firmaNombreEmpleado, setFirmaNombreEmpleado] = useState("");
  const [firmaImagenBase64, setFirmaImagenBase64] = useState("");
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const initialSnapshotRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const notify = (type, message) => {
    if (onNotify) {
      onNotify(type, message);
    }
  };

  const handlePesoChange = (index, value) => {
    const newPesos = [...pesos];
    newPesos[index] = value;
    setPesos(newPesos);

    if (errors[`peso_${index}`]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`peso_${index}`];
        return copy;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!fecha) newErrors.fecha = "La fecha es requerida";
    if (!hora) newErrors.hora = "La hora es requerida";
    if (!firmaNombreEmpleado) newErrors.firmaNombreEmpleado = "La firma (nombre del empleado) es requerida";
    if (!firmaImagenBase64) newErrors.firmaImagenBase64 = "Debe dibujar la firma";
    if (!envaseCantidad) newErrors.envaseCantidad = "Debe seleccionar la cantidad/envase";

    pesos.forEach((valor, index) => {
      if (valor === "" || valor === null) {
        newErrors[`peso_${index}`] = "Requerido";
      } else if (isNaN(Number(valor))) {
        newErrors[`peso_${index}`] = "Debe ser numérico";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#012b5c";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };

    const resizeHandler = () => resizeCanvas();
    resizeCanvas();
    window.addEventListener("resize", resizeHandler);

    const getCoordinates = (e) => {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDrawingRef.current = true;
      const coords = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    };

    const draw = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const coords = getCoordinates(e);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    };

    const stopDrawing = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        const dataUrl = canvas.toDataURL("image/png");
        setFirmaImagenBase64(dataUrl);
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
    canvas.addEventListener("touchcancel", stopDrawing, { passive: false });

    return () => {
      window.removeEventListener("resize", resizeHandler);
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseleave", stopDrawing);
      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDrawing);
      canvas.removeEventListener("touchcancel", stopDrawing);
    };
  }, []);

  const getCurrentSnapshot = () => createSnapshot({
    fechaValue: fecha,
    horaValue: hora,
    envaseValue: envaseCantidad,
    pesosValue: pesos,
    firmaNombreValue: firmaNombreEmpleado,
    firmaImagenValue: firmaImagenBase64,
  });

  const checkIsDirty = () => {
    if (initialSnapshotRef.current) {
      const currentSnapshot = getCurrentSnapshot();
      const isDifferent = JSON.stringify(currentSnapshot) !== JSON.stringify(initialSnapshotRef.current);
      return isDifferent;
    }
    return false;
  };

  const handleCloseAttempt = () => {
    if (!checkIsDirty()) {
      onClose();
      return;
    }
    if (window.confirm("Se perderán los datos no guardados. ¿Estás seguro de que quieres salir del formulario?")) {
      onClose();
    }
  };

  useEffect(() => {
    if (!pendingReport) {
      if (!initialSnapshotRef.current) {
        initialSnapshotRef.current = createSnapshot({
          fechaValue: "",
          horaValue: "",
          envaseValue: "",
          pesosValue: Array.from({ length: TOTAL_PESOS }, () => ""),
          firmaNombreValue: "",
          firmaImagenValue: "",
        });
      }
      return;
    }
    if (pendingReport.id) setDraftId(pendingReport.id);
    if (pendingReport.fecha) setFecha(pendingReport.fecha);
    if (pendingReport.hora) setHora(pendingReport.hora);
    if (pendingReport.envaseCantidad) setEnvaseCantidad(pendingReport.envaseCantidad);
    if (Array.isArray(pendingReport.pesos) && pendingReport.pesos.length > 0) {
      const nextPesos = Array.from({ length: TOTAL_PESOS }, (_, index) => {
        const value = pendingReport.pesos[index];
        if (value === null || value === undefined) return "";
        return String(value);
      });
      setPesos(nextPesos);
      initialSnapshotRef.current = createSnapshot({
        fechaValue: pendingReport.fecha || "",
        horaValue: pendingReport.hora || "",
        envaseValue: pendingReport.envaseCantidad || "",
        pesosValue: nextPesos,
        firmaNombreValue: "",
        firmaImagenValue: "",
      });
    } else {
      initialSnapshotRef.current = createSnapshot({
        fechaValue: pendingReport.fecha || "",
        horaValue: pendingReport.hora || "",
        envaseValue: pendingReport.envaseCantidad || "",
        pesosValue: Array.from({ length: TOTAL_PESOS }, () => ""),
        firmaNombreValue: "",
        firmaImagenValue: "",
      });
    }
  }, [pendingReport]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setFirmaImagenBase64("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const numericPesos = pesos.map((p) => Number(p));

    const payload = {
      employee_id: user?.usuario || user?.employee_id,
      fecha,
      hora,
      envaseCantidad,
      pesos: numericPesos,
      draftId,
      firmaNombreEmpleado,
      firmaImagenBase64,
    };

    try {
      const response = await fetch(`${apiBase}/createWeightReport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let result = {};
      if (text) {
        try { result = JSON.parse(text); } catch (parseError) { }
      }

      if (!response.ok) {
        throw new Error(result.message || result.error || `Error del servidor (${response.status})`);
      }

      notify("success", "Informe de Peso producto enviado correctamente.");
      if (onDraftStateChange) {
        await onDraftStateChange();
      }
      onClose();
    } catch (error) {
      notify("error", `Error al enviar el formulario: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    const newErrors = {};
    if (!fecha) newErrors.fecha = "La fecha es requerida";
    if (!hora) newErrors.hora = "La hora es requerida";
    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    setIsSaving(true);
    const payload = {
      employee_id: user?.usuario || user?.employee_id,
      fecha,
      hora,
      envaseCantidad,
      pesos: pesos.map((p) => (p === "" ? null : p)),
      draftId,
    };

    try {
      const response = await fetch(`${apiBase}/saveWeightDraft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      let result = {};
      if (text) {
        try { result = JSON.parse(text); } catch (parseError) { }
      }
      if (!response.ok) {
        throw new Error(result.message || result.error || "Error guardando borrador");
      }

      if (result.id) {
        setDraftId(result.id);
        initialSnapshotRef.current = createSnapshot({
          fechaValue: fecha,
          horaValue: hora,
          envaseValue: envaseCantidad,
          pesosValue: pesos,
          firmaNombreValue: "",
          firmaImagenValue: "",
        });
      }
      if (onDraftStateChange) {
        await onDraftStateChange();
      }
      notify("success", "Borrador guardado correctamente.");
    } catch (error) {
      notify("error", `Error al guardar el borrador: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (checkIsDirty()) {
        e.preventDefault();
        e.returnValue = "Se perderán los datos no guardados.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [fecha, hora, envaseCantidad, pesos, firmaNombreEmpleado, firmaImagenBase64]);

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container">
        <div className="tool-registration-header">
          <h1>Informe de Peso producto</h1>
          <button
            type="button"
            className="tool-registration-close"
            onClick={handleCloseAttempt}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tool-registration-form">
          <div className="form-group">
            <label htmlFor="fecha">1. FECHA <span className="required">*</span></label>
            <input type="date" id="fecha" name="fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} className={errors.fecha ? "error" : ""} />
            {errors.fecha && <span className="error-message">{errors.fecha}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hora">2. HORA <span className="required">*</span></label>
            <input type="time" id="hora" name="hora" value={hora} onChange={(e) => setHora(e.target.value)} className={errors.hora ? "error" : ""} />
            {errors.hora && <span className="error-message">{errors.hora}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="envaseCantidad">3. CANTIDAD/ENVASE <span className="required">*</span></label>
            <select id="envaseCantidad" name="envaseCantidad" value={envaseCantidad} onChange={(e) => setEnvaseCantidad(e.target.value)} className={errors.envaseCantidad ? "error" : ""}>
              <option value="">Selecciona una opción</option>
              <option value="2000 ML">2000 ml</option>
              <option value="3600 ML">3600 ml</option>
              <option value="200 ML">200 ml</option>
              <option value="165 ML">165 ml</option>
            </select>
            {errors.envaseCantidad && <span className="error-message">{errors.envaseCantidad}</span>}
          </div>

          <div className="form-group">
            <label>4. REGISTRO DE PESOS (80 valores) <span className="required">*</span></label>
            <div className="checklist-container" style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "0.75rem" }}>
              {pesos.map((valor, index) => (
                <div key={index} className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor={`peso_${index}`} style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem" }}>#{index + 1}</label>
                  <input type="number" step="0.01" id={`peso_${index}`} name={`peso_${index}`} value={valor} onChange={(e) => handlePesoChange(index, e.target.value)} className={errors[`peso_${index}`] ? "error" : ""} style={{ padding: "0.4rem 0.5rem" }} />
                  {errors[`peso_${index}`] && <span className="error-message" style={{ fontSize: "0.7rem" }}>{errors[`peso_${index}`]}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group form-group--signature">
            <label htmlFor="firmaNombreEmpleado">5. FIRMA (NOMBRE DEL EMPLEADO) <span className="required">*</span></label>
            <div className="signature-container">
              <div className="signature-name">
                <input type="text" id="firmaNombreEmpleado" name="firmaNombreEmpleado" value={firmaNombreEmpleado} onChange={(e) => setFirmaNombreEmpleado(e.target.value)} placeholder="Escriba el nombre del empleado que firma" className={errors.firmaNombreEmpleado ? "error" : ""} />
                {errors.firmaNombreEmpleado && <span className="error-message">{errors.firmaNombreEmpleado}</span>}
              </div>
              <canvas ref={canvasRef} className="signature-canvas"></canvas>
              <p className="signature-hint">Dibuja tu firma en el recuadro</p>
              <div className="signature-controls">
                <button type="button" className="dk-btn dk-btn--ghost" onClick={clearSignature}>Limpiar</button>
              </div>
              {errors.firmaImagenBase64 && <span className="error-message">{errors.firmaImagenBase64}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="dk-btn dk-btn--ghost" onClick={handleCloseAttempt}>Cancelar</button>
            <button type="button" className="dk-btn dk-btn--ghost" onClick={handleSaveDraft} disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar"}</button>
            <button type="submit" className="dk-btn dk-btn--primary" disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Enviar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WeightReport;

