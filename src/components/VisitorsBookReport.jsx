import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";

const VisitorsBookReport = ({ onClose, user, apiBase, onNotify }) => {
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
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [draftId, setDraftId] = useState(null);

  // Load pending draft from server (if any)
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
    try {
      const payload = {
        employee_id: user?.usuario || user?.employee_id,
        fecha: formData.fecha,
        horaEntrada: formData.horaEntrada,
        horaSalida: formData.horaSalida || null,
        nombreApellidos: formData.nombreApellidos,
        dni: formData.dni || null,
        empresa: formData.empresa || null,
        motivoVisita: formData.motivoVisita || null,
        haLeidoNormas: formData.haLeidoNormas || null,
        firmaNombreVisitante: formData.firmaNombreVisitante || null,
        firmaImagenBase64: formData.firmaImagenBase64 || null,
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

      notify("success", "Registro de Libro de visitas enviado correctamente. El informe ha sido guardado en la base de datos.");
      // Optionally clear draftId on success
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
              aria-label="Ver información del documento"
            >
              i
            </button>
            <button
              type="button"
              className="tool-registration-close"
              onClick={onClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        {showInfo && (
          <div className="tool-registration-info-box">
            <strong>PG12-2.2 REV-3 NORMAS PARA LA VISITA A LAS INSTALACIONES ALIMENTARIAS</strong>
            <p><strong>1. ¿PARA QUÉ SIRVE ESTE DOCUMENTO?</strong></p>
            <p>
              Este documento establece las normas obligatorias que deben cumplir todas las personas
              externas que acceden a las instalaciones de MOVAL FOODS S.L.U., garantizando la
              seguridad alimentaria, la calidad de nuestros productos y la protección de
              información confidencial. Aplica a visitantes comerciales, técnicos de mantenimiento,
              inspectores, auditores y cualquier persona ajena a la empresa que requiera acceso a
              nuestras instalaciones.
            </p>
            <p><strong>2. NORMAS QUE CUMPLIMOS</strong></p>
            <ul>
              <li>IFS Food versión 8: Requisito 4.21 (medidas de Food Defense y control de accesos)</li>
              <li>ISO 9001:2015: Cláusula 7.5 (gestión de información documentada y confidencialidad)</li>
              <li>ISO 22000:2018: Cláusula 7.2 (competencia del personal, incluyendo visitantes) y 8.9.1 (respuesta ante emergencias)</li>
              <li>Reglamento (CE) 852/2004: Higiene de productos alimenticios de origen animal</li>
            </ul>
            <p><strong>3. ¿QUIÉN ES RESPONSABLE?</strong></p>
            <p>
              MJose Alepuz (Responsable de Calidad) autoriza los accesos, proporciona el equipamiento
              de protección, verifica el cumplimiento de normas y conserva los registros de visitas.
            </p>
            <p>
              El personal de acompañamiento designado por MOVAL FOODS es responsable de supervisar
              al visitante durante toda su estancia, garantizando que no se acceda a zonas no
              autorizadas ni se incumplan las normas de seguridad alimentaria.
            </p>
            <p><strong>4. REQUISITOS PREVIOS AL ACCESO</strong></p>
            <ul>
              <li>Registrarse en el libro de control de accesos, indicando nombre completo, empresa, motivo de la visita, persona de contacto en MOVAL FOODS, y hora de entrada.</li>
              <li>Declarar que no ha presentado en las últimas 72 horas síntomas de enfermedad transmisible: vómitos, diarreas, fiebre, supuraciones de oído, garganta o piel.</li>
              <li>MOVAL FOODS puede denegar el acceso sin previo aviso por razones de seguridad alimentaria, Food Defense o situaciones de emergencia.</li>
            </ul>
            <p><strong>5. EQUIPAMIENTO DE PROTECCIÓN INDIVIDUAL (EPI)</strong></p>
            <ul>
              <li>Bata: Debe abrocharse completamente durante toda la visita.</li>
              <li>Cubrepies o zapatillas: Se colocan sobre el calzado personal.</li>
              <li>Cofia o gorro: El cabello debe quedar completamente cubierto.</li>
              <li>Guantes: Obligatorios si se llevan uñas postizas, manicura o se va a manipular cualquier elemento.</li>
              <li>Mascarilla: Obligatoria si se presentan síntomas de catarro o resfriado.</li>
            </ul>
            <p><strong>6. PROHIBICIONES ESTRICTAS</strong></p>
            <ul>
              <li>Portar joyas, bisutería, relojes, pendientes, anillos, collares, pulseras o cualquier objeto personal adornado. Única excepción: identificación sanitaria médica.</li>
              <li>Exhibir piercings visibles no cubiertos.</li>
              <li>Ingerir alimentos, bebidas, fumar, mascar chicle o aplicar cosméticos.</li>
              <li>Tocar el producto, envases, equipos o superficies de contacto con alimentos sin autorización expresa del acompañante.</li>
              <li>Fotografiar, filmar, grabar o realizar cualquier tipo de captura de imagen con dispositivos electrónicos sin autorización escrita previa del Responsable de Calidad.</li>
              <li>Acceder a zonas no autorizadas o separarse del personal de acompañamiento designado.</li>
              <li>Introducir bolsos, mochilas, maletines u objetos personales sin inspección previa.</li>
              <li>Dejar residuos de cualquier tipo. Cualquier incidente debe comunicarse inmediatamente al acompañante.</li>
            </ul>
            <p><strong>7. FOOD DEFENSE Y CONFIDENCIALIDAD</strong></p>
            <p>
              Nuestras instalaciones están protegidas contra accesos ilícitos, manipulaciones intencionadas
              y actividades terroristas (Food Defense según IFS v8 4.21).
            </p>
            <ul>
              <li>Reportar cualquier comportamiento sospechoso o anómalo al Responsable de Calidad.</li>
              <li>Mantener estricta confidencialidad sobre la información, procesos, equipos y prácticas observadas durante la visita.</li>
              <li>No divulgar, copiar, reproducir o transmitir información de MOVAL FOODS sin autorización escrita.</li>
            </ul>
            <p>El incumplimiento de estas obligaciones puede derivar en responsabilidades legales.</p>
            <p><strong>8. ACOMPAÑAMIENTO Y SUPERVISIÓN</strong></p>
            <ul>
              <li>El visitante será acompañado en todo momento por personal autorizado de MOVAL FOODS.</li>
              <li>No podrá desplazarse por las instalaciones sin su acompañante designado.</li>
              <li>Las zonas de acceso están restringidas según el motivo específico de la visita.</li>
              <li>El personal de acompañamiento puede interrumpir la visita si se detecta incumplimiento de normas.</li>
            </ul>
            <p><strong>9. INSTRUCCIONES EN CASO DE EMERGENCIA</strong></p>
            <ul>
              <li>Seguir inmediatamente las instrucciones de su acompañante o del personal de MOVAL FOODS.</li>
              <li>Dirigirse a los puntos de evacuación señalizados.</li>
              <li>No abandonar el edificio por su cuenta sin autorización.</li>
              <li>Teléfono de emergencias: contactar primero con el acompañante, quien activará el protocolo PG07 según corresponda.</li>
            </ul>
            <p><strong>10. DECLARACIÓN DE CONFORMIDAD</strong></p>
            <ul>
              <li>Ha leído y comprendido todas las normas anteriores.</li>
              <li>No presenta síntomas de enfermedad transmisible en las últimas 72 horas.</li>
              <li>Se compromete a cumplir estrictamente todas las obligaciones de seguridad alimentaria, Food Defense y confidencialidad.</li>
              <li>Acepta las consecuencias derivadas del incumplimiento de estas normas.</li>
            </ul>
          </div>
        )}

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
            <label htmlFor="horaEntrada">
              2. HORA ENTRADA <span className="required">*</span>
            </label>
            <input
              type="time"
              id="horaEntrada"
              name="horaEntrada"
              value={formData.horaEntrada}
              onChange={handleChange}
              className={errors.horaEntrada ? "error" : ""}
            />
            {errors.horaEntrada && <span className="error-message">{errors.horaEntrada}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="horaSalida">
              3. HORA SALIDA
            </label>
            <input
              type="time"
              id="horaSalida"
              name="horaSalida"
              value={formData.horaSalida}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="nombreApellidos">
              4. NOMBRE Y APELLIDOS <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nombreApellidos"
              name="nombreApellidos"
              value={formData.nombreApellidos}
              onChange={handleChange}
              className={errors.nombreApellidos ? "error" : ""}
            />
            {errors.nombreApellidos && <span className="error-message">{errors.nombreApellidos}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="dni">
              5. DNI
            </label>
            <input
              type="text"
              id="dni"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="empresa">
              6. EMPRESA <span className="required">*</span>
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
            <label htmlFor="motivoVisita">
              7. MOTIVO DE LA VISITA <span className="required">*</span>
            </label>
            <input
              type="text"
              id="motivoVisita"
              name="motivoVisita"
              value={formData.motivoVisita}
              onChange={handleChange}
              className={errors.motivoVisita ? "error" : ""}
            />
            {errors.motivoVisita && <span className="error-message">{errors.motivoVisita}</span>}
          </div>

          <div className="form-group">
            <label>
              8. ¿HA LEÍDO Y COMPRENDIDO LAS NORMAS PARA LA VISITA A LAS INSTALACIONES? <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["SI", "NO"].map((val) => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    name="haLeidoNormas"
                    value={val}
                    checked={formData.haLeidoNormas === val}
                    onChange={handleChange}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
            {errors.haLeidoNormas && <span className="error-message">{errors.haLeidoNormas}</span>}
          </div>

          {/* FIRMA VISITANTE + DIBUJO */}
          <div className="form-group form-group--signature">
            <label htmlFor="firmaNombreVisitante">
              9. FIRMA VISITANTE <span className="required">*</span>
            </label>
            <div className="signature-container">
              <div className="signature-name">
                <input
                  type="text"
                  id="firmaNombreVisitante"
                  name="firmaNombreVisitante"
                  value={formData.firmaNombreVisitante}
                  onChange={handleChange}
                  placeholder="Nombre del visitante que firma"
                  className={errors.firmaNombreVisitante ? "error" : ""}
                />
                {errors.firmaNombreVisitante && (
                  <span className="error-message">{errors.firmaNombreVisitante}</span>
                )}
              </div>
              <canvas
                ref={canvasRef}
                className="signature-canvas"
              ></canvas>
              <p className="signature-hint">Dibuja la firma en el recuadro</p>
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

export default VisitorsBookReport;








