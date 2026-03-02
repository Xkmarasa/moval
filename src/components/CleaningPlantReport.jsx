import { useState, useEffect, useRef } from "react";
import { LIMPIEZA_PLANTA_ZONAS, LIMPIEZA_PLANTA_PERIODOS } from "../data/limpiezaPlanta/index.js";
import "./ToolRegistration.css";
import { resizeSignatureCanvas, clearSignatureCanvas } from "../utils/signatureCanvas";

const CleaningPlantReport = ({ onClose, user, apiBase, onNotify, onConfirm }) => {
  const [step, setStep] = useState("selector"); // "selector" | "form"
  const [selectedZone, setSelectedZone] = useState(null);
  const [infoModal, setInfoModal] = useState(null);
  const [formData, setFormData] = useState({
    periodo: "SEMANAL",
    fecha: "",
    hora: "",
    limpiezaCompletada: false,
    firmaNombreEmpleado: "",
    firmaImagenBase64: "",
    firmaNombreResponsable: "",
    firmaImagenBase64Responsable: "",
  });

  const [checklistItems, setChecklistItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef(null);
  const canvasRefResponsable = useRef(null);
  const isDrawingRef = useRef(false);
  const isDrawingRefResponsable = useRef(false);

  const notify = (type, message) => {
    if (onNotify) onNotify(type, message);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fecha) newErrors.fecha = "La fecha es requerida";
    if (!formData.hora) newErrors.hora = "La hora es requerida";
    if (!formData.firmaNombreEmpleado) newErrors.firmaNombreEmpleado = "La firma (nombre del empleado) es requerida";
    if (!formData.firmaImagenBase64) newErrors.firmaImagenBase64 = "Debe dibujar la firma";

    // Validar checklist si se marca como completada
    if (formData.limpiezaCompletada && checklistItems.length > 0) {
      const allCompleted = checklistItems.every(item => item.completado);
      if (!allCompleted) {
        newErrors.checklist = "Debe completar todos los elementos de la checklist para marcar la limpieza como completada";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (step !== "form") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx;

    const setup = () => {
      requestAnimationFrame(() => {
        ctx = resizeSignatureCanvas(canvas);
      });
    };

    const resizeHandler = () => { ctx = resizeSignatureCanvas(canvas); };

    setup();
    window.addEventListener("resize", resizeHandler);

    const getCoordinates = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDrawing = (e) => {
      e.preventDefault();
      if (e.pointerId && canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;

      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = (e) => {
      if (e?.pointerId && canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch {}
      }
      if (!isDrawingRef.current) return;

      isDrawingRef.current = false;
      setFormData((prev) => ({ ...prev, firmaImagenBase64: canvas.toDataURL("image/png") }));
    };

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", startDrawing);
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointerleave", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);

    return () => {
      window.removeEventListener("resize", resizeHandler);
      canvas.removeEventListener("pointerdown", startDrawing);
      canvas.removeEventListener("pointermove", draw);
      canvas.removeEventListener("pointerup", stopDrawing);
      canvas.removeEventListener("pointerleave", stopDrawing);
      canvas.removeEventListener("pointercancel", stopDrawing);
    };
  }, [step, selectedZone]);

  // Efecto para el canvas del responsable
  useEffect(() => {
    if (step !== "form") return;

    const canvas = canvasRefResponsable.current;
    if (!canvas) return;

    let ctx;

    const setup = () => {
      requestAnimationFrame(() => {
        ctx = resizeSignatureCanvas(canvas);
      });
    };

    const resizeHandler = () => { ctx = resizeSignatureCanvas(canvas); };

    setup();
    window.addEventListener("resize", resizeHandler);

    const getCoordinates = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDrawing = (e) => {
      e.preventDefault();
      if (e.pointerId && canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      isDrawingRefResponsable.current = true;

      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e) => {
      if (!isDrawingRefResponsable.current) return;
      e.preventDefault();
      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = (e) => {
      if (e?.pointerId && canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch {}
      }
      if (!isDrawingRefResponsable.current) return;

      isDrawingRefResponsable.current = false;
      setFormData((prev) => ({ ...prev, firmaImagenBase64Responsable: canvas.toDataURL("image/png") }));
    };

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", startDrawing);
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointerleave", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);

    return () => {
      window.removeEventListener("resize", resizeHandler);
      canvas.removeEventListener("pointerdown", startDrawing);
      canvas.removeEventListener("pointermove", draw);
      canvas.removeEventListener("pointerup", stopDrawing);
      canvas.removeEventListener("pointerleave", stopDrawing);
      canvas.removeEventListener("pointercancel", stopDrawing);
    };
  }, [step, selectedZone]);

  useEffect(() => {
    if (selectedZone && formData.periodo) {
      const availablePeriods = LIMPIEZA_PLANTA_PERIODOS.filter((p) =>
        selectedZone.checklists?.[p.id]?.length > 0
      );
      const isValid = availablePeriods.some((p) => p.id === formData.periodo);
      if (!isValid && availablePeriods.length > 0) {
        setFormData((prev) => ({ ...prev, periodo: availablePeriods[0].id }));
      }
    }
  }, [selectedZone, formData.periodo]);

  // Generar checklist cuando cambie zona o período
  useEffect(() => {
    if (selectedZone && formData.periodo && selectedZone.checklists?.[formData.periodo]) {
      const items = selectedZone.checklists[formData.periodo].map((item, index) => ({
        id: `${formData.periodo}_${index}`,
        elemento: item.elemento,
        producto: item.producto,
        instrucciones: item.instrucciones,
        completado: item.completado || false
      }));
      setChecklistItems(items);
    } else {
      setChecklistItems([]);
    }
  }, [selectedZone, formData.periodo]);

  const handleChecklistChange = (itemId) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, completado: !item.completado } : item
      )
    );
  };

  const clearSignature = () => {
    clearSignatureCanvas(canvasRef.current);
    setFormData((prev) => ({ ...prev, firmaImagenBase64: "" }));
  };

  const clearSignatureResponsable = () => {
    clearSignatureCanvas(canvasRefResponsable.current);
    setFormData((prev) => ({ ...prev, firmaImagenBase64Responsable: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/createCleaningPlantReport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: user?.usuario || user?.employee_id,
          fecha: formData.fecha,
          hora: formData.hora,
          zona: selectedZone.id,
          zonaNombre: selectedZone.nombre,
          periodo: formData.periodo,
          limpiezaCompletada: formData.limpiezaCompletada,
          checklist: checklistItems,
          firmaNombreEmpleado: formData.firmaNombreEmpleado,
          firmaImagenBase64: formData.firmaImagenBase64,
          firmaNombreResponsable: formData.firmaNombreResponsable,
          firmaImagenBase64Responsable: formData.firmaImagenBase64Responsable,
        }),
      });

      const text = await response.text();
      if (!text) throw new Error("Respuesta vacía del servidor");
      const result = JSON.parse(text);

      if (!response.ok) {
        throw new Error(result.message || result.error || `Error del servidor (${response.status})`);
      }

      notify("success", "Informe de Limpieza Planta enviado correctamente.");
      onClose();
    } catch (error) {
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        notify("error", "Error de conexión. Verifique su conexión a internet.");
      } else {
        notify("error", `Error al enviar el formulario: ${error.message}`);
      }
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToSelector = () => {
    setSelectedZone(null);
    setStep("selector");
    setFormData({
      periodo: "SEMANAL",
      fecha: "",
      hora: "",
      limpiezaCompletada: false,
      firmaNombreEmpleado: "",
      firmaImagenBase64: "",
      firmaNombreResponsable: "",
      firmaImagenBase64Responsable: "",
    });
    setErrors({});
  };

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container">
        <div className="tool-registration-header">
          <h1>Limpieza Planta</h1>
          <button type="button" className="tool-registration-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {step === "selector" && (
          <div className="tool-registration-form" style={{ padding: "1.5rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {LIMPIEZA_PLANTA_ZONAS.map((zona) => (
                <button
                  key={zona.id}
                  type="button"
                  className="dk-btn dk-btn--primary"
                  style={{
                    padding: "1rem",
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textAlign: "left",
                    minHeight: "60px",
                  }}
                  onClick={() => {
                    setSelectedZone(zona);
                    setStep("form");
                  }}
                >
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{zona.icono || "🧹"}</span>
                  <span>{zona.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "form" && selectedZone && (
          <form onSubmit={handleSubmit} className="tool-registration-form">
            <div className="form-group">
              <label>Zona</label>
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "8px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  <span style={{ marginRight: "0.5rem" }}>{selectedZone.icono || "🧹"}</span>
                  {selectedZone.nombre}
                </span>
                <button
                  type="button"
                  className="dk-btn dk-btn--ghost"
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                  onClick={() => setInfoModal({ zona: selectedZone, periodo: formData.periodo })}
                  title="Ver instrucciones de limpieza"
                >
                  ℹ️ Información
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="periodo">1. PERIODO <span className="required">*</span></label>
              <select
                id="periodo"
                name="periodo"
                value={formData.periodo}
                onChange={handleChange}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
              >
                {LIMPIEZA_PLANTA_PERIODOS.filter((p) =>
                  !selectedZone || selectedZone.checklists?.[p.id]?.length > 0
                ).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fecha">2. FECHA <span className="required">*</span></label>
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
              <label htmlFor="hora">3. HORA <span className="required">*</span></label>
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

            {checklistItems.length > 0 && (
              <div className="form-group">
                <label>4. Checklist de limpieza:</label>
                <div className="checklist-container">
                  {checklistItems.map((item, index) => (
                    <div key={item.id || index} className="checklist-item">
                      <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={item.completado}
                          onChange={() => handleChecklistChange(item.id)}
                          style={{ width: "auto", cursor: "pointer", marginTop: "0.2rem" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
                            {item.elemento}
                          </div>
                          {item.producto && (
                            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>
                              <strong>Producto:</strong> {item.producto}
                            </div>
                          )}
                          {item.instrucciones && (
                            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                              <strong>Instrucciones:</strong> {item.instrucciones}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                {errors.checklist && <span className="error-message">{errors.checklist}</span>}
              </div>
            )}

            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="limpiezaCompletada"
                  checked={formData.limpiezaCompletada}
                  onChange={handleChange}
                  style={{ width: "auto", cursor: "pointer" }}
                />
                <span>5. Limpieza completada correctamente</span>
              </label>
            </div>

            <div className="form-group form-group--signature">
              <label htmlFor="firmaNombreEmpleado">
                6. FIRMA DEL EMPLEADO <span className="required">*</span>
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
                <canvas ref={canvasRef} className="signature-canvas" data-signature="empleado"></canvas>
                <p className="signature-hint">Dibuja tu firma en el recuadro</p>
                <div className="signature-controls">
                  <button type="button" className="dk-btn dk-btn--ghost" onClick={clearSignature}>
                    Limpiar
                  </button>
                </div>
                {errors.firmaImagenBase64 && (
                  <span className="error-message">{errors.firmaImagenBase64}</span>
                )}
              </div>
            </div>

            <div className="form-group form-group--signature">
              <label htmlFor="firmaNombreResponsable">
                7. FIRMA DEL RESPONSABLE
              </label>
              <div className="signature-container">
                <div className="signature-name">
                  <input
                    type="text"
                    id="firmaNombreResponsable"
                    name="firmaNombreResponsable"
                    value={formData.firmaNombreResponsable}
                    onChange={handleChange}
                    placeholder="Escriba el nombre del responsable que firma"
                  />
                </div>
                <canvas ref={canvasRefResponsable} className="signature-canvas" data-signature="responsable"></canvas>
                <p className="signature-hint">Dibuja la firma del responsable en el recuadro</p>
                <div className="signature-controls">
                  <button type="button" className="dk-btn dk-btn--ghost" onClick={clearSignatureResponsable}>
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="dk-btn dk-btn--ghost" onClick={handleBackToSelector}>
                Atrás
              </button>
              <button type="button" className="dk-btn dk-btn--ghost" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="dk-btn dk-btn--primary" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        )}

        {infoModal && (
          <div
            className="modal-overlay"
            style={{ position: "absolute", zIndex: 100 }}
            onClick={() => setInfoModal(null)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}
            >
              <div className="modal-header">
                <h2>Instrucciones de limpieza: {infoModal.zona?.nombre || infoModal.nombre}</h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setInfoModal(null)}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                {infoModal.zona?.checklists?.[infoModal.periodo]?.length > 0 ? (
                  <>
                    <p style={{ marginBottom: "1rem", fontWeight: "600", color: "#012b5c" }}>
                      Periodo: {infoModal.periodo}
                    </p>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#012b5c", color: "#fff" }}>
                            <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e2e8f0" }}>
                              Elemento / Zona
                            </th>
                            <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e2e8f0" }}>
                              Producto químico / útil
                            </th>
                            <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e2e8f0" }}>
                              Instrucciones / método
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {infoModal.zona.checklists[infoModal.periodo].map((row, idx) => (
                            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                              <td style={{ padding: "0.75rem", border: "1px solid #e2e8f0" }}>{row.elemento}</td>
                              <td style={{ padding: "0.75rem", border: "1px solid #e2e8f0" }}>{row.producto || "-"}</td>
                              <td style={{ padding: "0.75rem", border: "1px solid #e2e8f0" }}>{row.instrucciones || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="report-details">
                    <div className="report-detail-item">
                      <strong>Elementos o zonas a limpiar:</strong>
                      <span>{infoModal.zona?.elementosZonas || infoModal.elementosZonas}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Producto químico / útil:</strong>
                      <span>{infoModal.zona?.productoQuimicoUtil || infoModal.productoQuimicoUtil}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Instrucciones / método de limpieza:</strong>
                      <span style={{ whiteSpace: "pre-wrap" }}>{infoModal.zona?.instruccionesMetodo || infoModal.instruccionesMetodo}</span>
                    </div>
                  </div>
                )}
                <div className="modal-footer">
                  <button type="button" className="dk-btn dk-btn--primary" onClick={() => setInfoModal(null)}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CleaningPlantReport;
