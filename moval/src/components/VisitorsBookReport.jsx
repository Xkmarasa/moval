import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";

const VisitorsBookReport = ({ onClose, user, apiBase, onNotify, onConfirm }) => {
  const [formData, setFormData] = useState({
    fecha: "",
    horaEntrada: "",
    horaSalida: "",
    nombreApellidos: "",
    dni: "",
    empresa: "",
    motivoVisita: "",
    haLeidoNormas: "",
    firmaNombreVisitante: "",
    firmaImagenBase64: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftError, setDraftError] = useState("");
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [draftId, setDraftId] = useState(null);
  const initialSnapshotRef = useRef(null);

  const confirmAction = async (message) => {
    if (onConfirm) {
      const options = typeof message === 'string' 
        ? {
            title: "Salir del informe",
            message: message,
            confirmLabel: "Salir",
            cancelLabel: "Cancelar",
            tone: "warning",
          }
        : message;
      const result = await onConfirm(options);
      return result;
    }
    return true;
  };

  const createSnapshot = () => ({
    fecha: formData.fecha || "",
    horaEntrada: formData.horaEntrada || "",
    horaSalida: formData.horaSalida || "",
    nombreApellidos: formData.nombreApellidos || "",
    dni: formData.dni || "",
    empresa: formData.empresa || "",
    motivoVisita: formData.motivoVisita || "",
    haLeidoNormas: formData.haLeidoNormas || "",
    firmaNombreVisitante: formData.firmaNombreVisitante || "",
    firmaImagenBase64: formData.firmaImagenBase64 || "",
  });


  const checkIsDirty = () => {
    // Si hay un snapshot inicial (viene de un borrador), comparar datos actuales con el snapshot
    if (initialSnapshotRef.current) {
      const currentSnapshot = createSnapshot();
      const isDifferent = JSON.stringify(currentSnapshot) !== JSON.stringify(initialSnapshotRef.current);
      return isDifferent;
    }
    // Si NO hay snapshot inicial (formulario nuevo), devolver false - permitir cerrar sin confirmar
    return false;
  };

  const handleCloseAttempt = () => {
    if (!checkIsDirty()) {
      onClose();
      return;
    }
    // Hay cambios sin guardar, confirmar antes de cerrar
    if (window.confirm("Se perderán los datos no guardados. ¿Estás seguro de que quieres salir del formulario?")) {
      onClose();
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
  }, [formData]);

  useEffect(() => {
    let mounted = true;
    const loadPending = async () => {
      try {
        const employeeId = user?.usuario || user?.employee_id;
        if (!employeeId) return;
        const resp = await fetch(`${apiBase}/getPendingVisitorsBookReport?employeeId=${encodeURIComponent(employeeId)}`);
        const text = await resp.text();
        let data = {};
        if (text) {
          try { data = JSON.parse(text); } catch (e) { }
        }
        if (resp.ok && data.pending && mounted && data.report) {
          setFormData((prev) => ({ ...prev, ...data.report }));
          setDraftId(data.report.id);
          initialSnapshotRef.current = createSnapshot();
        }
      } catch (err) {
        // ignore
      }
    };
    loadPending();
    return () => { mounted = false; };
  }, [apiBase, user]);

  const notify = (type, message) => {
    if (onNotify) {
      onNotify(type, message);
    }
  };

  const handleSaveDraft = async () => {
    const newErrors = {};
    if (!formData.fecha) newErrors.fecha = "La fecha es requerida";
    if (!formData.horaEntrada) newErrors.horaEntrada = "La hora de entrada es requerida";
    if (!formData.nombreApellidos) newErrors.nombreApellidos = "El nombre y apellidos son requeridos";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({...prev, ...newErrors}));
      setDraftError("Por favor, completa los campos requeridos: Fecha, Hora de entrada y Nombre y apellidos");
      return;
    }

    setDraftError("");

    try {
      const payload = {
        employee_id: user?.usuario || user?.employee_id || "",
        fecha: formData.fecha || "",
        horaEntrada: formData.horaEntrada || "",
        horaSalida: formData.horaSalida || "",
        nombreApellidos: formData.nombreApellidos || "",
        dni: formData.dni || "",
        empresa: formData.empresa || "",
        motivoVisita: formData.motivoVisita || "",
        haLeidoNormas: formData.haLeidoNormas || "",
        firmaNombreVisitante: formData.firmaNombreVisitante || "",
        firmaImagenBase64: formData.firmaImagenBase64 || "",
        draftId,
      };
      const response = await fetch(`${apiBase}/saveVisitorsBookDraft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      let result = {};
      if (text) {
        try { result = JSON.parse(text); } catch (e) { }
      }
      if (!response.ok) throw new Error(result.message || result.error || "Error guardando borrador");
      if (result.id) setDraftId(result.id);
      notify("info", "Borrador guardado correctamente.");
    } catch (err) {
      notify("error", "Error guardando borrador: " + err.message);
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
    if (!formData.horaEntrada) newErrors.horaEntrada = "La hora de entrada es requerida";
    if (!formData.nombreApellidos) newErrors.nombreApellidos = "El nombre y apellidos son requeridos";
    if (!formData.empresa) newErrors.empresa = "La empresa es requerida";
    if (!formData.motivoVisita) newErrors.motivoVisita = "El motivo de la visita es requerido";
    if (!formData.haLeidoNormas) newErrors.haLeidoNormas = "Debe indicar si ha leído las normas";
    if (!formData.firmaNombreVisitante) newErrors.firmaNombreVisitante = "El nombre del visitante que firma es requerido";
    if (!formData.firmaImagenBase64) newErrors.firmaImagenBase64 = "Debe dibujar la firma";

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
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
        setFormData((prev) => ({ ...prev, firmaImagenBase64: dataUrl }));
        if (errors.firmaImagenBase64) {
          setErrors((prev) => ({ ...prev, firmaImagenBase64: "" }));
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
      setFormData((prev) => ({ ...prev, firmaImagenBase64: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const payload = {
      employee_id: user?.usuario || user?.employee_id,
      fecha: formData.fecha,
      horaEntrada: formData.horaEntrada,
      horaSalida: formData.horaSalida || null,
      nombreApellidos: formData.nombreApellidos,
      dni: formData.dni || null,
      empresa: formData.empresa,
      motivoVisita: formData.motivoVisita,
      haLeidoNormas: formData.haLeidoNormas,
      firmaNombreVisitante: formData.firmaNombreVisitante,
      firmaImagenBase64: formData.firmaImagenBase64,
    };

    try {
      const response = await fetch(`${apiBase}/createVisitorsBookReport`, {
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

      notify("success", "Registro de Libro de visitas enviado correctamente.");
      setDraftId(null);
      onClose();
    } catch (error) {
      notify("error", `Error al enviar el formulario: ${error.message}`);
      console.error("Error submitting visitors book report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container">
        <div className="tool-registration-header">
          <h1>Libro de visitas</h1>
          <div className="tool-registration-header-actions">
            <button
              type="button"
              className="tool-registration-info-button"
              onClick={() => setShowInfo((prev) => !prev)}
              aria-label="Ver información"
            >
              i
            </button>
            <button
              type="button"
              className="tool-registration-close"
              onClick={handleCloseAttempt}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        {showInfo && (
          <div className="tool-registration-info-box">
            <strong>PG12-2.2 REV-3 NORMAS PARA LA VISITA A LAS INSTALACIONES ALIMENTARIAS</strong>
            <p>Este documento establece las normas obligatorias que deben cumplir todas las personas externas que acceden a las instalaciones de MOVAL FOODS S.L.U.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="tool-registration-form">
          <div className="form-group">
            <label htmlFor="fecha">1. FECHA <span className="required">*</span></label>
            <input type="date" id="fecha" name="fecha" value={formData.fecha} onChange={handleChange} className={errors.fecha ? "error" : ""} />
            {errors.fecha && <span className="error-message">{errors.fecha}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="horaEntrada">2. HORA ENTRADA <span className="required">*</span></label>
            <input type="time" id="horaEntrada" name="horaEntrada" value={formData.horaEntrada} onChange={handleChange} className={errors.horaEntrada ? "error" : ""} />
            {errors.horaEntrada && <span className="error-message">{errors.horaEntrada}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="horaSalida">3. HORA SALIDA</label>
            <input type="time" id="horaSalida" name="horaSalida" value={formData.horaSalida} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="nombreApellidos">4. NOMBRE Y APELLIDOS <span className="required">*</span></label>
            <input type="text" id="nombreApellidos" name="nombreApellidos" value={formData.nombreApellidos} onChange={handleChange} className={errors.nombreApellidos ? "error" : ""} />
            {errors.nombreApellidos && <span className="error-message">{errors.nombreApellidos}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="dni">5. DNI</label>
            <input type="text" id="dni" name="dni" value={formData.dni} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="empresa">6. EMPRESA <span className="required">*</span></label>
            <input type="text" id="empresa" name="empresa" value={formData.empresa} onChange={handleChange} className={errors.empresa ? "error" : ""} />
            {errors.empresa && <span className="error-message">{errors.empresa}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="motivoVisita">7. MOTIVO DE LA VISITA <span className="required">*</span></label>
            <input type="text" id="motivoVisita" name="motivoVisita" value={formData.motivoVisita} onChange={handleChange} className={errors.motivoVisita ? "error" : ""} />
            {errors.motivoVisita && <span className="error-message">{errors.motivoVisita}</span>}
          </div>

          <div className="form-group">
            <label>8. ¿HA LEÍDO LAS NORMAS? <span className="required">*</span></label>
            <div className="radio-group">
              {["SI", "NO"].map((val) => (
                <label key={val} className="radio-label">
                  <input type="radio" name="haLeidoNormas" value={val} checked={formData.haLeidoNormas === val} onChange={handleChange} />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.haLeidoNormas && <span className="error-message">{errors.haLeidoNormas}</span>}
          </div>

          <div className="form-group form-group--signature">
            <label htmlFor="firmaNombreVisitante">9. FIRMA VISITANTE <span className="required">*</span></label>
            <div className="signature-container">
              <div className="signature-name">
                <input type="text" id="firmaNombreVisitante" name="firmaNombreVisitante" value={formData.firmaNombreVisitante} onChange={handleChange} placeholder="Nombre del visitante" className={errors.firmaNombreVisitante ? "error" : ""} />
                {errors.firmaNombreVisitante && <span className="error-message">{errors.firmaNombreVisitante}</span>}
              </div>
              <canvas ref={canvasRef} className="signature-canvas"></canvas>
              <p className="signature-hint">Dibuja la firma en el recuadro</p>
              <div className="signature-controls">
                <button type="button" className="dk-btn dk-btn--ghost" onClick={clearSignature}>Limpiar</button>
              </div>
              {errors.firmaImagenBase64 && <span className="error-message">{errors.firmaImagenBase64}</span>}
            </div>
          </div>

          {draftError && <div className="error-message" style={{ marginBottom: '1rem', textAlign: 'center' }}>{draftError}</div>}
          
          <div className="form-actions">
            <button type="button" className="dk-btn dk-btn--ghost" onClick={handleCloseAttempt}>Cancelar</button>
            <button type="button" className="dk-btn dk-btn--secondary" onClick={handleSaveDraft}>Guardar Borrador</button>
            <button type="submit" className="dk-btn dk-btn--primary" disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Enviar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VisitorsBookReport;

