import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";

const ReceptionExitReport = ({ onClose, user, apiBase, onNotify }) => {
  const [formData, setFormData] = useState({
    tipoMovimiento: "",
    empresa: "",
    nombreTransportista: "",
    dniMatricula: "",
    fecha: "",
    hora: "",
    producto: "",
    identificacionProducto: "",
    estadoCajas: "",
    bultos: "",
    palets: "",
    temperatura: "",
    higieneCamion: "",
    estadoPalets: "",
    aceptado: "",
    quienRecepciona: "",
    nombreConductor: "",
    firmaImagenBase64: "",
    numeroAlbaran: "",
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

    if (!formData.tipoMovimiento) newErrors.tipoMovimiento = "Entrada o salida es requerido";
    if (!formData.empresa) newErrors.empresa = "La empresa es requerida";
    if (!formData.nombreTransportista) newErrors.nombreTransportista = "El nombre del transportista es requerido";
    if (!formData.fecha) newErrors.fecha = "La fecha es requerida";
    if (!formData.hora) newErrors.hora = "La hora es requerida";
    if (!formData.producto) newErrors.producto = "El producto es requerido";
    if (!formData.identificacionProducto) newErrors.identificacionProducto = "La identificación del producto es requerida";
    if (!formData.estadoCajas) newErrors.estadoCajas = "El estado de las cajas es requerido";
    if (!formData.higieneCamion) newErrors.higieneCamion = "La higiene del camión es requerida";
    if (!formData.estadoPalets) newErrors.estadoPalets = "El estado de los palets es requerido";
    if (!formData.aceptado) newErrors.aceptado = "Debe indicar si se acepta la mercancía";
    if (!formData.quienRecepciona) newErrors.quienRecepciona = "La persona que recepciona es requerida";
    if (!formData.nombreConductor) newErrors.nombreConductor = "El nombre del conductor es requerido";
    if (!formData.firmaImagenBase64) newErrors.firmaImagenBase64 = "Debe dibujar la firma del conductor";

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
      tipoMovimiento: formData.tipoMovimiento,
      empresa: formData.empresa,
      nombreTransportista: formData.nombreTransportista,
      dniMatricula: formData.dniMatricula || null,
      fecha: formData.fecha,
      hora: formData.hora,
      producto: formData.producto,
      identificacionProducto: formData.identificacionProducto,
      estadoCajas: formData.estadoCajas,
      bultos: formData.bultos || null,
      palets: formData.palets || null,
      temperatura: formData.temperatura || null,
      higieneCamion: formData.higieneCamion,
      estadoPalets: formData.estadoPalets,
      aceptado: formData.aceptado,
      quienRecepciona: formData.quienRecepciona,
      nombreConductor: formData.nombreConductor,
      numeroAlbaran: formData.numeroAlbaran || null,
      firmaImagenBase64: formData.firmaImagenBase64,
    };

    try {
      const response = await fetch(`${apiBase}/createReceptionExitReport`, {
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

      notify("success", "Registro de Recepción y salida de mercancía enviado correctamente. El informe ha sido guardado en la base de datos.");
      onClose();
    } catch (error) {
      notify("error", `Error al enviar el formulario: ${error.message}`);
      console.error("Error submitting reception/exit report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tool-registration-overlay">
      <div className="tool-registration-container">
        <div className="tool-registration-header">
          <h1>Recepción y salida mercancía</h1>
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
            <label>
              1. ENTRADA / SALIDA <span className="required">*</span>
            </label>
            <div className="radio-group">
              {[
                { value: "E", label: "Entrada" },
                { value: "S", label: "Salida" },
              ].map((opt) => (
                <label key={opt.value} className="radio-label">
                  <input
                    type="radio"
                    name="tipoMovimiento"
                    value={opt.value}
                    checked={formData.tipoMovimiento === opt.value}
                    onChange={handleChange}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            {errors.tipoMovimiento && <span className="error-message">{errors.tipoMovimiento}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="empresa">
              2. EMPRESA <span className="required">*</span>
            </label>
            <input
              type="text"
              id="empresa"
              name="empresa"
              value={formData.empresa}
              onChange={handleChange}
              className={errors.empresa ? "error" : ""}
            />
            {errors.empresa && <span className="error-message">{errors.empresa}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="nombreTransportista">
              3. INFORMACIÓN TRANSPORTISTA (Nombre y apellidos) <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nombreTransportista"
              name="nombreTransportista"
              value={formData.nombreTransportista}
              onChange={handleChange}
              className={errors.nombreTransportista ? "error" : ""}
            />
            {errors.nombreTransportista && <span className="error-message">{errors.nombreTransportista}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="dniMatricula">
              4. DNI / MATRÍCULA CAMIÓN
            </label>
            <input
              type="text"
              id="dniMatricula"
              name="dniMatricula"
              value={formData.dniMatricula}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="numeroAlbaran">
              4.1 NÚMERO DE ALBARÁN
            </label>
            <input
              type="number"
              id="numeroAlbaran"
              name="numeroAlbaran"
              value={formData.numeroAlbaran}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fecha">
              5. FECHA <span className="required">*</span>
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
              5.1 HORA <span className="required">*</span>
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
              6. PRODUCTO <span className="required">*</span>
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
            <label>
              7. IDENTIFICACIÓN CORRECTA DEL PRODUCTO (Descrip., lote y caducidad) <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["SI", "NO"].map((val) => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    name="identificacionProducto"
                    value={val}
                    checked={formData.identificacionProducto === val}
                    onChange={handleChange}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.identificacionProducto && <span className="error-message">{errors.identificacionProducto}</span>}
          </div>

          <div className="form-group">
            <label>
              8. ESTADO DE LAS CAJAS <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["CORRECTO", "INCORRECTO"].map((val) => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    name="estadoCajas"
                    value={val}
                    checked={formData.estadoCajas === val}
                    onChange={handleChange}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.estadoCajas && <span className="error-message">{errors.estadoCajas}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="bultos">
              9. BULTOS
            </label>
            <input
              type="number"
              id="bultos"
              name="bultos"
              value={formData.bultos}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="palets">
              10. PALETS
            </label>
            <input
              type="number"
              id="palets"
              name="palets"
              value={formData.palets}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="temperatura">
              11. ºC
            </label>
            <input
              type="number"
              step="0.1"
              id="temperatura"
              name="temperatura"
              value={formData.temperatura}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>
              12. HIGIENE DEL CAMIÓN <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["CORRECTA", "INCORRECTA"].map((val) => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    name="higieneCamion"
                    value={val}
                    checked={formData.higieneCamion === val}
                    onChange={handleChange}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.higieneCamion && <span className="error-message">{errors.higieneCamion}</span>}
          </div>

          <div className="form-group">
            <label>
              13. ESTADO DE PALETS (limpios, sin grapas, astillas, plagas...) <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["CORRECTA", "INCORRECTA"].map((val) => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    name="estadoPalets"
                    value={val}
                    checked={formData.estadoPalets === val}
                    onChange={handleChange}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.estadoPalets && <span className="error-message">{errors.estadoPalets}</span>}
          </div>

          <div className="form-group">
            <label>
              14. ACEPTADO <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["SI", "NO"].map((val) => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    name="aceptado"
                    value={val}
                    checked={formData.aceptado === val}
                    onChange={handleChange}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.aceptado && <span className="error-message">{errors.aceptado}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="quienRecepciona">
              15. QUIÉN RECEPCIONA <span className="required">*</span>
            </label>
            <input
              type="text"
              id="quienRecepciona"
              name="quienRecepciona"
              value={formData.quienRecepciona}
              onChange={handleChange}
              className={errors.quienRecepciona ? "error" : ""}
            />
            {errors.quienRecepciona && <span className="error-message">{errors.quienRecepciona}</span>}
          </div>

          {/* FIRMA CONDUCTOR + NOMBRE */}
          <div className="form-group form-group--signature">
            <label htmlFor="nombreConductor">
              16. NOMBRE Y FIRMA CONDUCTOR <span className="required">*</span>
            </label>
            <div className="signature-container">
              <div className="signature-name">
                <input
                  type="text"
                  id="nombreConductor"
                  name="nombreConductor"
                  value={formData.nombreConductor}
                  onChange={handleChange}
                  placeholder="Nombre y apellidos del conductor"
                  className={errors.nombreConductor ? "error" : ""}
                />
                {errors.nombreConductor && (
                  <span className="error-message">{errors.nombreConductor}</span>
                )}
              </div>
              <canvas
                ref={canvasRef}
                className="signature-canvas"
              ></canvas>
              <p className="signature-hint">Dibuja la firma del conductor en el recuadro</p>
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

export default ReceptionExitReport;








