import { useState, useEffect, useRef } from "react";
import "./ToolRegistration.css";

// Importar imágenes de los kits desde src/kits
import kit1Image from "../kits/KIT_1_Envasadora_3.6kg.jpeg";
import kit2Image from "../kits/KIT_2_Envasadora_2kg.jpeg";
import kit3Image from "../kits/KIT_3_Envasadora_Tarrinas.jpeg";
import kit4Image from "../kits/KIT_4_Caja_comun.jpeg";

// Configuración de los kits con sus imágenes, nombres y carpetas de Dropbox asociadas
const kitsConfig = [
  {
    value: "KIT_1_ENVASADORA_3.6_KG",
    image: kit1Image,
    name: "KIT_1_Envasadora_3.6kg",
    displayName: "KIT_1_Envasadora_3.6kg",
    dropboxFolder: "ENVASADORA 3600",
  },
  {
    value: "KIT_2_ENVASADORA_2_KG",
    image: kit2Image,
    name: "KIT_2_Envasadora_2kg",
    displayName: "KIT_2_Envasadora_2kg",
    dropboxFolder: "ENVASADORA 2000 ML",
  },
  {
    value: "KIT_3_ENVASADORA_TARRINAS",
    image: kit3Image,
    name: "KIT_3_Envasadora_Tarrinas",
    displayName: "KIT_3_Envasadora_Tarrinas",
    dropboxFolder: "ENVASADORA TARRINAS",
  },
  {
    value: "KIT_4_CAJA_COMUN",
    image: kit4Image,
    name: "KIT_4_Caja_comun",
    displayName: "KIT_4_Caja_comun",
    dropboxFolder: "CAJA COMUN",
  },
];

const ToolRegistration = ({ onClose, user, apiBase, onNotify }) => {
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    tipoRegistro: "",
    empresaTecnico: "",
    kit: "",
    checklistEntrada: "",
    checklistSalida: "",
    noConformidad: "",
    firma: null,
    firmaNombreEmpleado: "",
    fotos: [],
  });

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const notify = (type, message) => {
    if (onNotify) {
      onNotify(type, message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    
    // Configurar el tamaño del canvas basado en el tamaño visual
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
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
        // Guardar la firma como imagen
        canvas.toBlob((blob) => {
          if (blob) {
            setFormData((prev) => ({
              ...prev,
              firma: blob,
            }));
          }
        }, "image/png");
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
        firma: null,
      }));
    }
  };

  // Funciones para la cámara
  const startCamera = () => {
    // Usar el input file con capture para todos los dispositivos
    // Esto abre la cámara nativa en móviles y permite seleccionar cámara en desktop
    const fileInput = document.getElementById("camera-file-input");
    if (fileInput) {
      fileInput.click();
    }
  };


  const handleCameraFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Crear un File object con el nombre correcto
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const newFile = new File([file], `foto-${timestamp}.jpg`, { type: "image/jpeg" });
      setFormData((prev) => ({
        ...prev,
        fotos: [...prev.fotos, newFile],
      }));
    }
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = "";
  };

  const handleImportFile = () => {
    // Usar el input file sin capture para importar archivos
    const fileInput = document.getElementById("import-file-input");
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleImportFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Añadir todos los archivos seleccionados
      const newFiles = files.map((file) => {
        // Mantener el nombre original o crear uno con timestamp si no tiene extensión
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const extension = file.name.split(".").pop() || "jpg";
        const fileName = file.name || `foto-${timestamp}.${extension}`;
        return new File([file], fileName, { type: file.type || "image/jpeg" });
      });
      setFormData((prev) => ({
        ...prev,
        fotos: [...prev.fotos, ...newFiles],
      }));
    }
    // Limpiar el input para permitir seleccionar los mismos archivos de nuevo
    e.target.value = "";
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const file = new File([blob], `foto-${timestamp}.jpg`, { type: "image/jpeg" });
          setFormData((prev) => ({
            ...prev,
            fotos: [...prev.fotos, file],
          }));
        }
      }, "image/jpeg", 0.9);
    }
  };

  const removePhoto = (index) => {
    setFormData((prev) => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index),
    }));
  };

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);


  const validateForm = () => {
    const newErrors = {};

    if (!formData.fecha) newErrors.fecha = "La fecha es requerida";
    if (!formData.hora) newErrors.hora = "La hora es requerida";
    if (!formData.tipoRegistro) newErrors.tipoRegistro = "El tipo de registro es requerido";
    
    if (formData.tipoRegistro === "MANTENIMIENTO_EXTERNO" && !formData.empresaTecnico) {
      newErrors.empresaTecnico = "La empresa/técnico es requerida";
    }
    
    if (formData.tipoRegistro === "HERRAMIENTAS_ENVASADORAS" && !formData.kit) {
      newErrors.kit = "Debe seleccionar un kit";
    }
    
    if (!formData.checklistEntrada) newErrors.checklistEntrada = "Debe indicar si el checklist de entrada está conforme";
    if (!formData.checklistSalida) newErrors.checklistSalida = "Debe indicar si el checklist de salida está conforme";
    if (formData.fotos.length === 0) newErrors.fotos = "Debe tomar al menos una foto";
    if (!formData.noConformidad) newErrors.noConformidad = "Debe indicar si hay no conformidad";
    if (!formData.firma) newErrors.firma = "Debe proporcionar una firma";
    if (!formData.firmaNombreEmpleado) newErrors.firmaNombreEmpleado = "Debe indicar el nombre del empleado que firma";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    // Preparar los datos para enviar
    // Preparar FormData para enviar las fotos
    const formDataToSend = new FormData();
    formDataToSend.append("employee_id", user?.usuario || user?.employee_id);
    formDataToSend.append("fecha", formData.fecha);
    formDataToSend.append("hora", formData.hora);
    formDataToSend.append("tipoRegistro", formData.tipoRegistro);
    if (formData.empresaTecnico) {
      formDataToSend.append("empresaTecnico", formData.empresaTecnico);
    }
    if (formData.kit) {
      formDataToSend.append("kit", formData.kit);
    }
    formDataToSend.append("checklistEntrada", formData.checklistEntrada);
    formDataToSend.append("checklistSalida", formData.checklistSalida);
    formDataToSend.append("noConformidad", formData.noConformidad);
    
    // Añadir fotos
    formData.fotos.forEach((foto, index) => {
      formDataToSend.append(`fotos`, foto);
    });
    
    // Añadir firma si existe
    if (formData.firma) {
      formDataToSend.append("firma", formData.firma);
    }
    if (formData.firmaNombreEmpleado) {
      formDataToSend.append("firmaNombreEmpleado", formData.firmaNombreEmpleado);
    }

    // Añadir timeout de 60 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${apiBase}/createToolReport`, {
        method: "POST",
        // No establecer Content-Type, el navegador lo hará automáticamente con FormData
        body: formDataToSend,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Manejar errores de red
      if (!response.ok && response.status === 404) {
        throw new Error("La función createToolReport no está disponible. Por favor, despliega las funciones actualizadas.");
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

      notify("success", "Formulario enviado correctamente. El informe ha sido guardado en la base de datos.");
      onClose();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        notify("error", "La petición tardó demasiado tiempo. Por favor, verifique su conexión e intente nuevamente.");
      } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
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
          <h1>PG03.6 - Registro herramientas</h1>
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

          {/* TIPO DE REGISTRO */}
          <div className="form-group">
            <label>
              3. TIPO DE REGISTRO <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="tipoRegistro"
                  value="MANTENIMIENTO_EXTERNO"
                  checked={formData.tipoRegistro === "MANTENIMIENTO_EXTERNO"}
                  onChange={handleInputChange}
                />
                <span>MANTENIMIENTO EXTERNO</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="tipoRegistro"
                  value="HERRAMIENTAS_ENVASADORAS"
                  checked={formData.tipoRegistro === "HERRAMIENTAS_ENVASADORAS"}
                  onChange={handleInputChange}
                />
                <span>HERRAMIENTAS ENVASADORAS (SEMANAL)</span>
              </label>
            </div>
            {errors.tipoRegistro && <span className="error-message">{errors.tipoRegistro}</span>}
          </div>

          {/* EMPRESA/TECNICO (solo si es MANTENIMIENTO EXTERNO) */}
          {formData.tipoRegistro === "MANTENIMIENTO_EXTERNO" && (
            <div className="form-group">
              <label htmlFor="empresaTecnico">
                4. EMPRESA/TECNICO (SOLO EN MANTENIMIENTO EXTERNO) <span className="required">*</span>
              </label>
              <input
                type="text"
                id="empresaTecnico"
                name="empresaTecnico"
                value={formData.empresaTecnico}
                onChange={handleInputChange}
                placeholder="Escriba su respuesta"
                className={errors.empresaTecnico ? "error" : ""}
              />
              {errors.empresaTecnico && <span className="error-message">{errors.empresaTecnico}</span>}
            </div>
          )}

          {/* KIT (solo si es HERRAMIENTAS ENVASADORAS) */}
          {formData.tipoRegistro === "HERRAMIENTAS_ENVASADORAS" && (
            <div className="form-group">
              <label>
                4. KIT <span className="required">*</span>
              </label>
              <div className="kit-grid">
                {kitsConfig.map((kit) => (
                  <label key={kit.value} className="kit-option">
                    <input
                      type="radio"
                      name="kit"
                      value={kit.value}
                      checked={formData.kit === kit.value}
                      onChange={handleInputChange}
                    />
                    <div className="kit-image-container">
                      <img 
                        src={kit.image} 
                        alt={kit.displayName} 
                        className="kit-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const placeholder = e.target.parentElement.querySelector('.kit-image-placeholder');
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                      <div className="kit-image-placeholder">
                        <span>{kit.name}</span>
                      </div>
                    </div>
                    <span className="kit-label">{kit.displayName}</span>
                  </label>
                ))}
              </div>
              {errors.kit && <span className="error-message">{errors.kit}</span>}
            </div>
          )}

          {/* CHECKLIST ENTRADA */}
          <div className="form-group">
            <label>
              5. CHECKLIST ENTRADA CONFORME <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="checklistEntrada"
                  value="SI"
                  checked={formData.checklistEntrada === "SI"}
                  onChange={handleInputChange}
                />
                <span>Sí</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="checklistEntrada"
                  value="NO"
                  checked={formData.checklistEntrada === "NO"}
                  onChange={handleInputChange}
                />
                <span>No</span>
              </label>
            </div>
            {errors.checklistEntrada && <span className="error-message">{errors.checklistEntrada}</span>}
          </div>

          {/* CHECKLIST SALIDA */}
          <div className="form-group">
            <label>
              6. CHECK LIST SALIDA CONFORME <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="checklistSalida"
                  value="SI"
                  checked={formData.checklistSalida === "SI"}
                  onChange={handleInputChange}
                />
                <span>Sí</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="checklistSalida"
                  value="NO"
                  checked={formData.checklistSalida === "NO"}
                  onChange={handleInputChange}
                />
                <span>No</span>
              </label>
            </div>
            {errors.checklistSalida && <span className="error-message">{errors.checklistSalida}</span>}
          </div>

          {/* FOTOS CON CÁMARA O IMPORTAR */}
          <div className="form-group">
            <label>
              7. FOTOS <span className="required">*</span>
            </label>
            <div className="photos-section">
              {/* Input file oculto para tomar fotos desde la cámara (funciona en móviles y desktop) */}
              <input
                type="file"
                id="camera-file-input"
                accept="image/*"
                capture="environment"
                onChange={handleCameraFileInput}
                style={{ display: "none" }}
              />
              
              {/* Input file oculto para importar archivos */}
              <input
                type="file"
                id="import-file-input"
                accept="image/*"
                multiple
                onChange={handleImportFileInput}
                style={{ display: "none" }}
              />
              
              {!cameraActive ? (
                <div className="camera-buttons" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="dk-btn dk-btn--secondary"
                    onClick={startCamera}
                  >
                    📷 Tomar foto
                  </button>
                  <button
                    type="button"
                    className="dk-btn dk-btn--secondary"
                    onClick={handleImportFile}
                  >
                    📁 Importar foto
                  </button>
                </div>
              ) : (
                <div className="camera-container">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="camera-preview"
                  ></video>
                  <div className="camera-controls">
                    <button
                      type="button"
                      className="dk-btn dk-btn--primary"
                      onClick={capturePhoto}
                    >
                      📸 Capturar foto
                    </button>
                    <button
                      type="button"
                      className="dk-btn dk-btn--ghost"
                      onClick={stopCamera}
                    >
                      Cerrar cámara
                    </button>
                  </div>
                </div>
              )}
              
              {formData.fotos.length > 0 && (
                <div className="photos-grid">
                  {formData.fotos.map((foto, index) => (
                    <div key={index} className="photo-item">
                      <img
                        src={URL.createObjectURL(foto)}
                        alt={`Foto ${index + 1}`}
                        className="photo-preview"
                      />
                      <button
                        type="button"
                        className="photo-remove"
                        onClick={() => removePhoto(index)}
                        aria-label="Eliminar foto"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.fotos && <span className="error-message">{errors.fotos}</span>}
          </div>

          {/* NO CONFORMIDAD */}
          <div className="form-group">
            <label>
              8. ¿NO CONFORMIDAD? <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="noConformidad"
                  value="SI"
                  checked={formData.noConformidad === "SI"}
                  onChange={handleInputChange}
                />
                <span>SI</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="noConformidad"
                  value="NO"
                  checked={formData.noConformidad === "NO"}
                  onChange={handleInputChange}
                />
                <span>NO</span>
              </label>
            </div>
            {errors.noConformidad && <span className="error-message">{errors.noConformidad}</span>}
          </div>

          {/* FIRMA */}
          <div className="form-group form-group--signature">
            <label htmlFor="firma">
              9. FIRMA <span className="required">*</span>
            </label>
            <div className="signature-container">
              <div className="signature-name">
                <label htmlFor="firmaNombreEmpleado">
                  Nombre del empleado que firma <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="firmaNombreEmpleado"
                  name="firmaNombreEmpleado"
                  value={formData.firmaNombreEmpleado}
                  onChange={handleInputChange}
                  placeholder="Escriba el nombre del empleado"
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
            </div>
            {errors.firma && <span className="error-message">{errors.firma}</span>}
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

export default ToolRegistration;

