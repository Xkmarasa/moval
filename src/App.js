  import { useEffect, useRef, useState } from "react";
import "./App.css";
import "./Toast.css";
import BrandLogo from "./components/BrandLogo";
import Login from "./components/Login";
import { useAuth } from "./context/AuthContext";
import ToolRegistration from "./components/ToolRegistration";
import InitialReport from "./components/InitialReport";
import PackagingReport from "./components/PackagingReport";
import WitnessReport from "./components/WitnessReport";
import ProductionReport from "./components/ProductionReport";
import WeightReport from "./components/WeightReport";
import CleaningReport from "./components/CleaningReport";
import CleaningPlantReport from "./components/CleaningPlantReport";
import VisitorsBookReport from "./components/VisitorsBookReport";
import ReceptionExitReport from "./components/ReceptionExitReport";
import ControlResiduesReport from "./components/ControlResiduesReport";
import ControlExpeditionReport from "./components/ControlExpeditionReport";
import ControlAguaDiario from "./components/ControlAguaDiario";
import ControlAguaSemanal from "./components/ControlAguaSemanal";
import ControlAguaMensual from "./components/ControlAguaMensual";
import ControlAguaTrimestral from "./components/ControlAguaTrimestral";
import * as XLSX from "xlsx";
import { LIMPIEZA_PLANTA_ZONAS } from "./data/limpiezaPlantaZonas";

function App() {
  const { user, role, logout, apiBase } = useAuth();
  const [workerLoading, setWorkerLoading] = useState(null);
  const [workerMessage, setWorkerMessage] = useState(null);
  const [hasPendingEntry, setHasPendingEntry] = useState(false);
  const [adminRecords, setAdminRecords] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [stats, setStats] = useState({
    activeEmployees: 0,
    hoursToday: 0,
  });
  const [totalWorkedHours, setTotalWorkedHours] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showToolRegistration, setShowToolRegistration] = useState(false);
  const [showControlAguaSelector, setShowControlAguaSelector] = useState(false);
  const [toolReports, setToolReports] = useState([]);
  const [initialReports, setInitialReports] = useState([]);
  const [packagingReports, setPackagingReports] = useState([]);
  const [productionReports, setProductionReports] = useState([]);
  const [weightReports, setWeightReports] = useState([]);
  const [witnessReports, setWitnessReports] = useState([]);
  const [cleaningReports, setCleaningReports] = useState([]);
  const [cleaningPlantReports, setCleaningPlantReports] = useState([]);
  const [visitorsBookReports, setVisitorsBookReports] = useState([]);
  const [receptionExitReports, setReceptionExitReports] = useState([]);
  const [controlResiduesReports, setControlResiduesReports] = useState([]);
  const [controlExpeditionReports, setControlExpeditionReports] = useState([]);
  const [controlAguaDiarioReports, setControlAguaDiarioReports] = useState([]);
  const [controlAguaSemanalReports, setControlAguaSemanalReports] = useState([]);
  const [controlAguaMensualReports, setControlAguaMensualReports] = useState([]);
  const [controlAguaTrimestralReports, setControlAguaTrimestralReports] = useState([]);
  const [satisfactionForms, setSatisfactionForms] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  const [selectedInforme, setSelectedInforme] = useState(null);
  const [pendingWeightReport, setPendingWeightReport] = useState(null);
  const [pendingVisitorsBookDrafts, setPendingVisitorsBookDrafts] = useState([]);
  const [pendingWeightDrafts, setPendingWeightDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [weeklySummaryRows, setWeeklySummaryRows] = useState([]);
  const [weeklySummaryMeta, setWeeklySummaryMeta] = useState(null);
  const [weeklySummaryLoading, setWeeklySummaryLoading] = useState(false);
  const [weeklySummaryError, setWeeklySummaryError] = useState(null);
  const [showWeeklyExportModal, setShowWeeklyExportModal] = useState(false);
  const [weeklyExportForm, setWeeklyExportForm] = useState({
    semana: "",
    lote: "",
    fechaCaducidad: "",
    responsable: "",
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingToolReport, setEditingToolReport] = useState(null);
  const [editingInitialReport, setEditingInitialReport] = useState(null);
  const [editingPackagingReport, setEditingPackagingReport] = useState(null);
  const [editingProductionReport, setEditingProductionReport] = useState(null);
  const [editingWeightReport, setEditingWeightReport] = useState(null);
  const [editingCleaningReport, setEditingCleaningReport] = useState(null);
  const [editingCleaningPlantReport, setEditingCleaningPlantReport] = useState(null);
  const [editingWitnessReport, setEditingWitnessReport] = useState(null);
  const [editingVisitorsBookReport, setEditingVisitorsBookReport] = useState(null);
  const [editingReceptionExitReport, setEditingReceptionExitReport] = useState(null);
  const [editingControlResiduesReport, setEditingControlResiduesReport] = useState(null);
  const [editingControlExpeditionReport, setEditingControlExpeditionReport] = useState(null);
  const [editingControlAguaDiarioReport, setEditingControlAguaDiarioReport] = useState(null);
  const [editingControlAguaSemanalReport, setEditingControlAguaSemanalReport] = useState(null);
  const [editingControlAguaMensualReport, setEditingControlAguaMensualReport] = useState(null);
  const [editingControlAguaTrimestralReport, setEditingControlAguaTrimestralReport] = useState(null);
  const [editingSatisfactionForm, setEditingSatisfactionForm] = useState(null);
  const [deletingRecordId, setDeletingRecordId] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [deletingReportType, setDeletingReportType] = useState(null);
  const [activeTab, setActiveTab] = useState("herramientas");
  const [pendingRecordsLimit, setPendingRecordsLimit] = useState(10);
  const [historyRecordsLimit, setHistoryRecordsLimit] = useState(10);
  const [limpiezaPlantaZonaFilter, setLimpiezaPlantaZonaFilter] = useState("TODAS");
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const toastTimerRef = useRef(null);
  const pendingRecords = adminRecords.filter(
      (record) => record.check_in && !record.check_out,
  );
  const completedRecords = adminRecords.filter(
      (record) => record.check_in && record.check_out,
  );

  const notify = (type, text) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ type, text });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const getEmployeeName = (report) => {
    return (
      (report && (report.firmaNombreEmpleado || (report.datosCompletos && report.datosCompletos.firmaNombreEmpleado))) ||
      report?.employeeName || report?.employee || report?.employee_id || ""
    );
  };

  const confirmAction = (options) =>
    new Promise((resolve) => {
      setConfirmDialog({
        title: options.title || "Confirmar acción",
        message: options.message,
        confirmLabel: options.confirmLabel || "Confirmar",
        cancelLabel: options.cancelLabel || "Cancelar",
        tone: options.tone || "warning",
        onConfirm: () => {
          resolve(true);
          setConfirmDialog(null);
        },
        onCancel: () => {
          resolve(false);
          setConfirmDialog(null);
        },
      });
    });

  const renderNotifications = () => {
    const titleMap = {
      success: "Correcto",
      error: "Error",
      warning: "Atención",
      info: "Información",
    };
    return (
      <>
        {toast && (
          <div className={`app-toast app-toast--${toast.type || "info"}`}>
            <div className="app-toast__content">
              <p className="app-toast__title">{titleMap[toast.type] || "Aviso"}</p>
              <p className="app-toast__text">{toast.text}</p>
            </div>
            <button
              type="button"
              className="app-toast__close"
              onClick={() => setToast(null)}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        )}
        {confirmDialog && (
          <div className="app-dialog-backdrop" role="dialog" aria-modal="true">
            <div className={`app-dialog app-dialog--${confirmDialog.tone || "warning"}`}>
              <div className="app-dialog__header">
                <h3>{confirmDialog.title}</h3>
              </div>
              <p className="app-dialog__message">{confirmDialog.message}</p>
              <div className="app-dialog__actions">
                <button
                  type="button"
                  className="dk-btn dk-btn--ghost"
                  onClick={confirmDialog.onCancel}
                >
                  {confirmDialog.cancelLabel || "Cancelar"}
                </button>
                <button
                  type="button"
                  className="dk-btn dk-btn--primary app-dialog__confirm"
                  onClick={confirmDialog.onConfirm}
                >
                  {confirmDialog.confirmLabel || "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  useEffect(() => {
    if (role !== "admin") {
      return;
    }
    let isMounted = true;
    const fetchRecords = async () => {
      setAdminLoading(true);
      setAdminError(null);
      try {
        const response = await fetch(`${apiBase}/listEntries?limit=50`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "No se pudo obtener el registro");
        }
        if (isMounted) {
          setAdminRecords(data);
          const totalHours = data.reduce(
            (sum, record) => sum + (record.worked_hours || 0),
            0,
          );
          setTotalWorkedHours(Math.round(totalHours * 100) / 100);
        }
      } catch (error) {
        if (isMounted) {
          setAdminError(error.message);
        }
      } finally {
        if (isMounted) {
          setAdminLoading(false);
        }
      }
    };
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const response = await fetch(`${apiBase}/getStats`);
        const data = await response.json();
        if (response.ok && isMounted) {
          const adjustedData = {
            ...data,
            activeEmployees: Math.max(0, (data.activeEmployees || 0) - 1),
          };
          setStats(adjustedData);
        }
      } catch (error) {
        console.warn("Failed to fetch stats", error);
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    };
    fetchRecords();
    fetchStats();
    
    // Cargar automáticamente los datos de limpieza planta
    fetchReportsByType("limpieza_planta");
    
    return () => {
      isMounted = false;
    };
  }, [role, apiBase]);

  // Resetear límites cuando cambian los registros
  useEffect(() => {
    if (role === "admin") {
      setPendingRecordsLimit(10);
      setHistoryRecordsLimit(10);
    }
  }, [adminRecords.length, role]);

  // Función para eliminar un registro de tiempo
  const handleDeleteRecord = async (recordId) => {
    const confirmed = await confirmAction({
      title: "Eliminar registro",
      message: "¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/deleteEntry?id=${recordId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Error al eliminar el registro");
      }

      // Actualizar la lista de registros
      setAdminRecords(adminRecords.filter((r) => r.id !== recordId));
      setDeletingRecordId(null);
      notify("success", "Registro eliminado correctamente.");
    } catch (error) {
      notify("error", `Error al eliminar el registro: ${error.message}`);
      console.error("Error deleting record:", error);
    }
  };

  // Función para actualizar un registro de tiempo
  const handleUpdateRecord = async (recordId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateEntry?id=${recordId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Error al actualizar el registro");
      }

      // Actualizar la lista de registros
      const updatedRecords = adminRecords.map((r) =>
        r.id === recordId ? {...r, ...data} : r
      );
      setAdminRecords(updatedRecords);
      setEditingRecord(null);
      notify("success", "Registro actualizado correctamente.");
    } catch (error) {
      notify("error", `Error al actualizar el registro: ${error.message}`);
      console.error("Error updating record:", error);
    }
  };

  // Función para eliminar un informe de herramientas
  const handleDeleteToolReport = async (reportId) => {
    const confirmed = await confirmAction({
      title: "Eliminar informe",
      message: "¿Estás seguro de que quieres eliminar este informe? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/deleteToolReport?id=${reportId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Error al eliminar el informe");
      }

      // Actualizar la lista de informes
      setToolReports(toolReports.filter((r) => r.id !== reportId));
      setDeletingReportId(null);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(null);
      }
      notify("success", "Informe eliminado correctamente.");
    } catch (error) {
      notify("error", `Error al eliminar el informe: ${error.message}`);
      console.error("Error deleting tool report:", error);
    }
  };

  // Función para actualizar un informe de herramientas
  const handleUpdateToolReport = async (reportId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateToolReport?id=${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Error al actualizar el informe");
      }

      // Actualizar la lista de informes
      const updatedReports = toolReports.map((r) =>
        r.id === reportId ? {...r, ...data} : r
      );
      setToolReports(updatedReports);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(data);
      }
      setEditingToolReport(null);
      notify("success", "Informe actualizado correctamente.");
    } catch (error) {
      notify("error", `Error al actualizar el informe: ${error.message}`);
      console.error("Error updating tool report:", error);
    }
  };

  // Función para actualizar un informe de control de residuos
  const handleUpdateControlResiduesReport = async (reportId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateControlResiduesReport?id=${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Error al actualizar el informe");
      }

      const updatedReports = controlResiduesReports.map((r) =>
        r.id === reportId ? { ...r, ...data } : r
      );
      setControlResiduesReports(updatedReports);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(data);
      }
      setEditingControlResiduesReport(null);
      notify("success", "Informe actualizado correctamente.");
    } catch (error) {
      notify("error", `Error al actualizar el informe: ${error.message}`);
      console.error("Error updating control residues report:", error);
    }
  };

  const handleUpdateCleaningPlantReport = async (reportId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateCleaningPlantReport?id=${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Error al actualizar el informe");
      }

      const updatedReports = cleaningPlantReports.map((r) =>
        r.id === reportId ? { ...r, ...data } : r
      );
      setCleaningPlantReports(updatedReports);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(data);
      }
      setEditingCleaningPlantReport(null);
      notify("success", "Informe actualizado correctamente.");
    } catch (error) {
      notify("error", `Error al actualizar el informe: ${error.message}`);
      console.error("Error updating cleaning plant report:", error);
    }
  };

  const handleUpdateControlExpeditionReport = async (reportId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateControlExpeditionReport?id=${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Error al actualizar el informe");
      }

      const updatedReports = controlExpeditionReports.map((r) =>
        r.id === reportId ? { ...r, ...data } : r
      );
      setControlExpeditionReports(updatedReports);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(data);
      }
      setEditingControlExpeditionReport(null);
      notify("success", "Informe actualizado correctamente.");
    } catch (error) {
      notify("error", `Error al actualizar el informe: ${error.message}`);
      console.error("Error updating control expedition report:", error);
    }
  };

  const handleUpdateControlAguaDiarioReport = async (reportId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateControlAguaDiarioReport?id=${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error(`Error al actualizar el informe (${response.status})`);
      }

      const data = await response.json();
      const updatedReports = controlAguaDiarioReports.map((r) =>
        r.id === reportId ? { ...r, ...data } : r,
      );
      setControlAguaDiarioReports(updatedReports);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({ ...selectedReport, ...data });
      }
      setEditingControlAguaDiarioReport(null);
      notify("success", "Informe actualizado correctamente.");
    } catch (error) {
      notify("error", `Error al actualizar el informe: ${error.message}`);
      console.error("Error updating control agua diario report:", error);
    }
  };

  const handleUpdateControlAguaSemanalReport = async (reportId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateControlAguaSemanalReport?id=${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error(`Error al actualizar el informe (${response.status})`);
      }

      const data = await response.json();
      const updatedReports = controlAguaSemanalReports.map((r) =>
        r.id === reportId ? { ...r, ...data } : r,
      );
      setControlAguaSemanalReports(updatedReports);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({ ...selectedReport, ...data });
      }
      setEditingControlAguaSemanalReport(null);
      notify("success", "Informe actualizado correctamente.");
    } catch (error) {
      notify("error", `Error al actualizar el informe: ${error.message}`);
      console.error("Error updating control agua semanal report:", error);
    }
  };

  const handleUpdateControlAguaMensualReport = async (reportId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateControlAguaMensualReport?id=${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error(`Error al actualizar el informe (${response.status})`);
      }

      const data = await response.json();
      const updatedReports = controlAguaMensualReports.map((r) =>
        r.id === reportId ? { ...r, ...data } : r,
      );
      setControlAguaMensualReports(updatedReports);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({ ...selectedReport, ...data });
      }
      setEditingControlAguaMensualReport(null);
      notify("success", "Informe actualizado correctamente.");
    } catch (error) {
      notify("error", `Error al actualizar el informe: ${error.message}`);
      console.error("Error updating control agua mensual report:", error);
    }
  };

  const handleUpdateControlAguaTrimestralReport = async (reportId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateControlAguaTrimestralReport?id=${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error(`Error al actualizar el informe (${response.status})`);
      }

      const data = await response.json();
      const updatedReports = controlAguaTrimestralReports.map((r) =>
        r.id === reportId ? { ...r, ...data } : r,
      );
      setControlAguaTrimestralReports(updatedReports);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({ ...selectedReport, ...data });
      }
      setEditingControlAguaTrimestralReport(null);
      notify("success", "Informe actualizado correctamente.");
    } catch (error) {
      notify("error", `Error al actualizar el informe: ${error.message}`);
      console.error("Error updating control agua trimestral report:", error);
    }
  };

  const handleUpdateCustomerSatisfactionForm = async (formId, updatedData) => {
    try {
      const response = await fetch(`${apiBase}/updateCustomerSatisfactionForm?id=${formId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Error al actualizar la encuesta");
      }

      const updatedForms = satisfactionForms.map((form) =>
        form.id === formId ? { ...form, ...data } : form
      );
      setSatisfactionForms(updatedForms);
      if (selectedReport && selectedReport.id === formId) {
        setSelectedReport(data);
      }
      setEditingSatisfactionForm(null);
      notify("success", "Encuesta actualizada correctamente.");
    } catch (error) {
      notify("error", `Error al actualizar la encuesta: ${error.message}`);
      console.error("Error updating satisfaction form:", error);
    }
  };

  // Verificar si el trabajador tiene una entrada pendiente
  useEffect(() => {
    if (role === "admin" || !user) {
      return;
    }
    let isMounted = true;
    const checkPendingEntry = async () => {
      try {
        const response = await fetch(`${apiBase}/listEntries?employeeId=${user.usuario}&limit=1`);
        const data = await response.json();
        if (response.ok && isMounted) {
          // Verificar si hay alguna entrada sin salida
          const pending = data.some(
            (record) => record.check_in && !record.check_out
          );
          setHasPendingEntry(pending);
        }
      } catch (error) {
        console.warn("Failed to check pending entry", error);
      }
    };
    checkPendingEntry();
    return () => {
      isMounted = false;
    };
  }, [role, user, apiBase]);

  // Función para cargar informes por tipo
  const fetchReportsByType = async (type) => {
    if (role !== "admin") return;
    
    setReportsLoading(true);
    setReportsError(null);
    
    try {
      let endpoint = "";
      switch (type) {
        case "herramientas":
          endpoint = "listToolReports";
          break;
        case "inicial":
          endpoint = "listInitialReports";
          break;
        case "envasado":
          endpoint = "listPackagingReports";
          break;
        case "produccion":
          endpoint = "listProductionReports";
          break;
        case "peso":
          endpoint = "listWeightReports";
          break;
        case "limpieza":
          endpoint = "listCleaningReports";
          break;
        case "limpieza_planta":
          endpoint = "listCleaningPlantReports";
          break;
        case "testigos":
          endpoint = "listWitnessReports";
          break;
          case "libro_visitas":
            endpoint = "listVisitorsBookReports";
            break;
          case "recepcion_salida":
            endpoint = "listReceptionExitReports";
            break;
        case "control_residuos":
          endpoint = "listControlResiduesReports";
          break;
        case "control_expedicion":
          endpoint = "listControlExpeditionReports";
          break;
        case "control_agua_diario":
          endpoint = "listControlAguaDiarioReports";
          break;
        case "control_agua_semanal":
          endpoint = "listControlAguaSemanalReports";
          break;
        case "control_agua_mensual":
          endpoint = "listControlAguaMensualReports";
          break;
        case "control_agua_trimestral":
          endpoint = "listControlAguaTrimestralReports";
          break;
        case "satisfaccion":
          endpoint = "listCustomerSatisfactionForms";
          break;
        default:
          return;
      }
      
      const url = `${apiBase}/${endpoint}?limit=200`;
      console.log(`Fetching reports from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `Error ${response.status}` };
        }
        throw new Error(errorData.message || `Error al cargar informes: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Received ${data.length || 0} reports for type: ${type}`, data);
      
      // Asegurarse de que data es un array
      if (!Array.isArray(data)) {
        console.warn(`Expected array but got:`, typeof data, data);
        return;
      }
      
      switch (type) {
        case "herramientas":
          setToolReports(data);
          break;
        case "inicial":
          setInitialReports(data);
          break;
        case "envasado":
          setPackagingReports(data);
          break;
        case "produccion":
          setProductionReports(data);
          break;
        case "peso":
          setWeightReports(data);
          break;
        case "limpieza":
          setCleaningReports(data);
          break;
        case "limpieza_planta":
          setCleaningPlantReports(data);
          break;
        case "testigos":
          setWitnessReports(data);
          break;
        case "libro_visitas":
          setVisitorsBookReports(data);
          break;
        case "recepcion_salida":
          setReceptionExitReports(data);
          break;
        case "control_residuos":
          setControlResiduesReports(data);
          break;
        case "control_expedicion":
          setControlExpeditionReports(data);
          break;
        case "control_agua_diario":
          setControlAguaDiarioReports(data);
          break;
        case "control_agua_semanal":
          setControlAguaSemanalReports(data);
          break;
        case "control_agua_mensual":
          setControlAguaMensualReports(data);
          break;
        case "control_agua_trimestral":
          setControlAguaTrimestralReports(data);
          break;
        case "satisfaccion":
          setSatisfactionForms(data);
          break;
      }
    } catch (error) {
      setReportsError(error.message);
      console.error("Error fetching reports:", error);
    } finally {
      setReportsLoading(false);
    }
  };

  // Cargar informes cuando cambia el rol a admin
  useEffect(() => {
    if (role === "admin" && activeTab) {
      fetchReportsByType(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, activeTab, apiBase]);

  useEffect(() => {
    if (role !== "admin") return;
    fetchWeeklySummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, apiBase]);

  const refreshPendingWeightReport = async () => {
    if (role === "admin") return;
    const employeeId = user?.usuario || user?.employee_id;
    if (!employeeId) return;

    try {
      const response = await fetch(
        `${apiBase}/getPendingWeightReport?employeeId=${encodeURIComponent(employeeId)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Error al comprobar peso producto");
      }
      const pending = data && data.pending ? data.report : null;
      setPendingWeightReport(pending);
    } catch (error) {
      console.warn("Failed to check pending weight report", error);
    } finally {
      // no-op
    }
  };

  // Función para cargar todos los borradores pendientes (admin)
  const fetchAllPendingDrafts = async () => {
    if (role !== "admin") return;
    setDraftsLoading(true);
    try {
      // Cargar borradores de libro de visitas
      const visitorsResponse = await fetch(`${apiBase}/listVisitorsBookDrafts?limit=100`);
      if (visitorsResponse.ok) {
        const visitorsData = await visitorsResponse.json();
        setPendingVisitorsBookDrafts(Array.isArray(visitorsData) ? visitorsData : []);
      }
      
      // Cargar borradores de peso producto
      const weightResponse = await fetch(`${apiBase}/listWeightDrafts?limit=100`);
      if (weightResponse.ok) {
        const weightData = await weightResponse.json();
        setPendingWeightDrafts(Array.isArray(weightData) ? weightData : []);
      }
    } catch (error) {
      console.warn("Failed to fetch pending drafts", error);
    } finally {
      setDraftsLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") return;
    refreshPendingWeightReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user, apiBase]);

  // Cargar borradores cuando el admin accede
  useEffect(() => {
    if (role === "admin") {
      fetchAllPendingDrafts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, apiBase]);

  const formatDate = (value) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}`;
  };

  const getWeekRange = (referenceDate = new Date()) => {
    const date = new Date(referenceDate);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  };

  const parseReportDate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const buildDeviationDetails = (reports, predicate) => {
    const deviated = reports.filter(predicate);
    const details = deviated.map((report) => {
      const fecha = report.fecha || "";
      const hora = report.hora || "";
      const empleado = report.employee_id || "";
      return `${fecha} ${hora} ${empleado}`.trim();
    });
    return {
      count: deviated.length,
      details,
    };
  };

  const fetchWeeklySummary = async () => {
    if (role !== "admin") return;
    setWeeklySummaryLoading(true);
    setWeeklySummaryError(null);
    try {
      const { start, end } = getWeekRange();
      const filterByWeek = (report) => {
        const date = parseReportDate(report.fecha);
        if (!date) return false;
        return date >= start && date <= end;
      };

      const fetchReports = async (endpoint) => {
        const response = await fetch(`${apiBase}/${endpoint}?limit=1000`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || data.error || `Error al cargar ${endpoint}`);
        }
        return Array.isArray(data) ? data : [];
      };

      const [
        initialList,
        productionList,
        weightList,
        witnessList,
        cleaningList,
        cleaningPlantList,
        packagingList,
        controlExpeditionList,
      ] = await Promise.all([
        fetchReports("listInitialReports"),
        fetchReports("listProductionReports"),
        fetchReports("listWeightReports"),
        fetchReports("listWitnessReports"),
        fetchReports("listCleaningReports"),
        fetchReports("listCleaningPlantReports"),
        fetchReports("listPackagingReports"),
        fetchReports("listControlExpeditionReports"),
      ]);

      const initialReportsWeek = initialList.filter(filterByWeek);
      const productionReportsWeek = productionList.filter(filterByWeek);
      const weightReportsWeek = weightList.filter(filterByWeek);
      const witnessReportsWeek = witnessList.filter(filterByWeek);
      const cleaningReportsWeek = cleaningList.filter(filterByWeek);
      const cleaningPlantReportsWeek = cleaningPlantList.filter(filterByWeek);
      const packagingReportsWeek = packagingList.filter(filterByWeek);
      const controlExpeditionReportsWeek = controlExpeditionList.filter(filterByWeek);

      const normalizeEnvase = (value) => String(value || "").toUpperCase().replace(/\s+/g, " ").trim();
      const getWeightAverage = (report) => {
        if (report.promedio !== undefined && report.promedio !== null) {
          const num = Number(report.promedio);
          return Number.isNaN(num) ? NaN : num;
        }
        if (report.resumenPesos && report.resumenPesos.promedio !== undefined) {
          const num = Number(report.resumenPesos.promedio);
          return Number.isNaN(num) ? NaN : num;
        }
        return NaN;
      };
      const weightTargets = {
        "165 ML": 165,
        "200 ML": 200,
        "2000 ML": 2000,
        "3600 ML": 3600,
      };
      const isSmallEnvase = (envase) => envase === "165 ML" || envase === "200 ML";
      const isLargeEnvase = (envase) => envase === "2000 ML" || envase === "3600 ML";
      const buildWeightDeviation = (reports, tolerance) => {
        const deviated = [];
        reports.forEach((report) => {
          const envase = normalizeEnvase(report.envaseCantidad);
          const target = weightTargets[envase];
          const promedio = getWeightAverage(report);
          if (!target || Number.isNaN(promedio)) {
            return;
          }
          const diffRatio = Math.abs(promedio - target) / target;
          if (diffRatio > tolerance) {
            deviated.push({
              ...report,
              _envase: envase,
              _promedio: promedio,
            });
          }
        });
        const details = deviated.map((report) => {
          const fecha = report.fecha || "";
          const hora = report.hora || "";
          const empleado = report.employee_id || "";
          return `${fecha} ${hora} ${empleado} (${report._envase}=${report._promedio})`.trim();
        });
        return {
          count: deviated.length,
          details,
        };
      };

      const initialDeviation = buildDeviationDetails(initialReportsWeek, (report) => (
        report.instalacionesLimpias === "NO" ||
        report.manipuladoresUniformados === "NO" ||
        report.peloProtegido === "NO" ||
        report.unasLimpias === "NO" ||
        report.elementosTamiz === "NO" ||
        report.calibracionPHMetro === "NO"
      ));

      const packagingDeviation = buildDeviationDetails(packagingReportsWeek, (report) => (
        report.checklist?.paradasEmergencia === "NO" ||
        report.checklist?.integridadBoquillas === "NO" ||
        report.checklist?.fechaLoteImpresos === "NO" ||
        report.checklist?.fechaLoteLegibles === "NO" ||
        report.checklist?.envasesCierran === "NO" ||
        report.checklist?.etiquetaCorrecta === "NO" ||
        report.checklist?.unidadesCaja === "NO" ||
        report.paradasEmergencia === "NO" ||
        report.integridadBoquillas === "NO" ||
        report.fechaLoteImpresos === "NO" ||
        report.fechaLoteLegibles === "NO" ||
        report.envasesCierran === "NO" ||
        report.etiquetaCorrecta === "NO" ||
        report.unidadesCaja === "NO"
      ));

      const controlExpeditionDeviation = buildDeviationDetails(controlExpeditionReportsWeek, (report) => (
        report.paletIntegro === "NO" ||
        report.flejadoOK === "NO" ||
        report.etiquetaCorrecta === "NO" ||
        report.conteoCorrecto === "NO"
      ));

      const productionDeviation = buildDeviationDetails(productionReportsWeek, (report) => {
        const noAceptable = [
          report.color,
          report.olor,
          report.sabor,
          report.textura,
        ].some((value) => value === "NO_ACEPTABLE");
        const tipoProducto = report.tipoProducto || "";
        const limitePh = tipoProducto === "MAYONESA" ? 4.2 : 4.4;
        const phValue = Number(report.phPcc2);
        const phAlto = !Number.isNaN(phValue) && phValue > limitePh;
        return noAceptable || phAlto;
      });

      const witnessDeviation = buildDeviationDetails(witnessReportsWeek, (report) => {
        const selected = Array.isArray(report.tipoTestigo) ? report.tipoTestigo : [];
        return !selected.includes("FE") || !selected.includes("INOX") || !selected.includes("NO_INOX");
      });

      const weightSmallReports = weightReportsWeek.filter((report) => {
        const envase = normalizeEnvase(report.envaseCantidad);
        return isSmallEnvase(envase);
      });
      const weightLargeReports = weightReportsWeek.filter((report) => {
        const envase = normalizeEnvase(report.envaseCantidad);
        return isLargeEnvase(envase);
      });
      const weightSmallDeviation = buildWeightDeviation(weightSmallReports, 0.045);
      const weightLargeDeviation = buildWeightDeviation(weightLargeReports, 0.015);

      const rows = [
        {
          area: "Control inicial planta",
          registros: initialReportsWeek.length,
          desviaciones: initialDeviation,
        },
        {
          area: "PCC2 – pH",
          registros: productionReportsWeek.length,
          desviaciones: productionDeviation,
        },
        {
          area: "Control de pesos 1,9 kg",
          registros: weightLargeReports.length,
          desviaciones: weightLargeDeviation,
        },
        {
          area: "Control de pesos 165 g",
          registros: weightSmallReports.length,
          desviaciones: weightSmallDeviation,
        },
        {
          area: "Control testigos detector metales",
          registros: witnessReportsWeek.length,
          desviaciones: witnessDeviation,
        },
        {
          area: "Control limpieza",
          registros: cleaningReportsWeek.length,
          desviaciones: { count: 0, details: [] },
        },
        {
          area: "Limpieza planta",
          registros: cleaningPlantReportsWeek.length,
          desviaciones: { count: 0, details: [] },
        },
        {
          area: "Control almacenado palets",
          registros: controlExpeditionReportsWeek.length,
          desviaciones: controlExpeditionDeviation,
        },
        {
          area: "Control envasado",
          registros: packagingReportsWeek.length,
          desviaciones: packagingDeviation,
        },
      ];

      setWeeklySummaryRows(rows);
      setWeeklySummaryMeta({
        start,
        end,
      });
    } catch (error) {
      setWeeklySummaryError(error.message);
    } finally {
      setWeeklySummaryLoading(false);
    }
  };

  const applyRowStyle = (worksheet, rowIndex, style) => {
    if (!worksheet || !worksheet["!ref"]) return;
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ c: C, r: rowIndex });
      const cell = worksheet[address];
      if (!cell) continue;
      cell.s = style;
    }
  };

  const exportWeeklySummary = () => {
    if (!weeklySummaryMeta) return;
    const { start, end } = weeklySummaryMeta;
    const headerSemana = weeklyExportForm.semana || `${formatDate(start)} – ${formatDate(end)}`;
    const lote = weeklyExportForm.lote || "";
    const fechaCaducidad = weeklyExportForm.fechaCaducidad || "";
    const responsable = weeklyExportForm.responsable || "";

    const totalDesviaciones = weeklySummaryRows.reduce((acc, row) => acc + row.desviaciones.count, 0);
    const estadoGlobal = totalDesviaciones > 0 ? "NO CONFORME" : "SIN DESVIACIONES";

    const tableRows = weeklySummaryRows.map((row) => {
      const detalles = row.desviaciones.details.join("; ");
      const desviacionesValue = row.desviaciones.count === 0
        ? "0"
        : `${row.desviaciones.count}${detalles ? ` (${detalles})` : ""}`;
      return [
        row.area,
        row.registros,
        desviacionesValue,
        row.desviaciones.count > 0 ? "NO CONFORME" : "CONFORME",
      ];
    });

    const sheetData = [
      ["DASHBOARD SEMANAL CONTROL PRODUCCIÓN", "", "", "", "LOTE", lote],
      ["Semana", headerSemana, "", "", "FEC. CAD.", fechaCaducidad],
      ["Responsable revisión", responsable, "", "", "", ""],
      [""],
      ["ÁREA CONTROLADA", "Registros real", "Desviaciones de", "Estado"],
      ...tableRows,
      [""],
      ["TOTAL DESVIACIONES SEMANALES", totalDesviaciones],
      ["ESTADO GLOBAL DEL SISTEMA", estadoGlobal],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    worksheet["!cols"] = [
      { wch: 36 },
      { wch: 24 },
      { wch: 50 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
    ];
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 1 }, e: { r: 1, c: 3 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } },
    ];

    applyRowStyle(worksheet, 4, {
      fill: { patternType: "solid", fgColor: { rgb: "012B5C" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Control semanal");
    XLSX.writeFile(workbook, `control_semanal_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Función para renderizar la tabla de informes según el tipo activo
  const renderReportsTable = () => {
    let reports = [];
    let reportType = "";
    
    switch (activeTab) {
      case "herramientas":
        reports = toolReports;
        reportType = "herramientas";
        break;
      case "inicial":
        reports = initialReports;
        reportType = "inicial";
        break;
      case "envasado":
        reports = packagingReports;
        reportType = "envasado";
        break;
      case "produccion":
        reports = productionReports;
        reportType = "produccion";
        break;
      case "peso":
        reports = weightReports;
        reportType = "peso";
        break;
      case "limpieza":
        reports = cleaningReports;
        reportType = "limpieza";
        break;
      case "limpieza_planta":
        reports = cleaningPlantReports;
        reportType = "limpieza_planta";
        break;
      case "testigos":
        reports = witnessReports;
        reportType = "testigos";
        break;
        case "libro_visitas":
          reports = visitorsBookReports;
          reportType = "libro_visitas";
          break;
        case "recepcion_salida":
          reports = receptionExitReports;
          reportType = "recepcion_salida";
          break;
      case "control_residuos":
        reports = controlResiduesReports;
        reportType = "control_residuos";
        break;
      case "control_expedicion":
        reports = controlExpeditionReports;
        reportType = "control_expedicion";
        break;
      case "control_agua_diario":
        reports = controlAguaDiarioReports;
        reportType = "control_agua_diario";
        break;
      case "control_agua_semanal":
        reports = controlAguaSemanalReports;
        reportType = "control_agua_semanal";
        break;
      case "control_agua_mensual":
        reports = controlAguaMensualReports;
        reportType = "control_agua_mensual";
        break;
      case "control_agua_trimestral":
        reports = controlAguaTrimestralReports;
        reportType = "control_agua_trimestral";
        break;
      case "satisfaccion":
        reports = satisfactionForms;
        reportType = "satisfaccion";
        break;
      default:
        return <p>Selecciona un tipo de informe</p>;
    }

    if (reports.length === 0) {
      return <p>No hay informes de este tipo.</p>;
    }

    const normalizeWitnessTypes = (tipoTestigo) => {
      if (Array.isArray(tipoTestigo)) {
        return tipoTestigo.filter((value) => value && String(value).trim() !== "");
      }
      if (typeof tipoTestigo === "string" && tipoTestigo.trim() !== "") {
        return [tipoTestigo.trim()];
      }
      return [];
    };

    const yesNoFromValue = (value) => {
      if (value === true) return "SI";
      if (typeof value === "string" && value.toUpperCase() === "SI") return "SI";
      return "NO";
    };

    // Función para exportar a Excel
    const exportToExcel = () => {
      let dataForExcel = reports;

      if (reportType === "peso") {
        // Para peso producto, cada valor de peso va en una columna independiente
        const TOTAL_PESOS = 80;
        dataForExcel = reports.map((report) => {
          const row = {
            Empleado: report.employee_id,
            Fecha: report.fecha,
            Hora: report.hora,
            Envase: report.envaseCantidad || "",
            Promedio: report.promedio ?? "",
            FirmaDropbox: report.firmaInfo?.sharedLink || "",
          };
          const pesos = Array.isArray(report.pesos) ? report.pesos : [];
          for (let i = 0; i < TOTAL_PESOS; i++) {
            row[`Peso_${i + 1}`] = pesos[i] ?? "";
          }
          const entradas = Array.isArray(report.entradas) ? report.entradas : [];
          entradas.forEach((entrada, index) => {
            row[`Entrada_${index + 1}_Fecha`] = entrada.fechaEntrada || "";
            row[`Entrada_${index + 1}_Hora`] = entrada.horaEntrada || "";
            const pesosEntrada = Array.isArray(entrada.pesosRegistrados) ? entrada.pesosRegistrados : [];
            const productos = pesosEntrada.filter((valor) => valor !== null && valor !== undefined && valor !== "").length;
            row[`Entrada_${index + 1}_Productos`] = productos;
          });
          return row;
        });
      } else if (reportType === "produccion") {
        dataForExcel = reports.map((report) => {
          const checklist =
            report.datosCompletos?.checklistComponentes ||
            report.checklistComponentes ||
            report.checklist ||
            {};
          return {
            Empleado: report.employee_id,
            Fecha: report.fecha,
            Hora: report.hora,
            Producto: report.tipoProducto ?? "",
            Color: report.color ?? "",
            Olor: report.olor ?? "",
            Sabor: report.sabor ?? "",
            Textura: report.textura ?? "",
            "pH (PCC2)": report.phPcc2 ?? report.datosCompletos?.phPcc2 ?? "",
            "Número campaña": report.numeroCampana ?? report.datosCompletos?.numeroCampana ?? "",
            Aceite: yesNoFromValue(checklist.aceite),
            Huevo: yesNoFromValue(checklist.huevo),
            Yema: yesNoFromValue(checklist.yema),
            Ajo: yesNoFromValue(checklist.ajo),
            Sal: yesNoFromValue(checklist.sal),
            Limon: yesNoFromValue(checklist.limon),
            Sorbato: yesNoFromValue(checklist.sorbato),
            Xantana: yesNoFromValue(checklist.xantana),
            Colorante: yesNoFromValue(checklist.colorante),
            Benzoato: yesNoFromValue(checklist.benzoato),
            FirmaDropbox: report.firmaInfo?.sharedLink || "",
          };
        });
      } else if (reportType === "testigos") {
        dataForExcel = reports.map((report) => {
          const selected = normalizeWitnessTypes(report.tipoTestigo);
          return {
            Empleado: report.employee_id,
            Fecha: report.fecha,
            Hora: report.hora,
            "Testigo FE": selected.includes("FE") ? "SI" : "NO",
            "Testigo INOX": selected.includes("INOX") ? "SI" : "NO",
            "Testigo NO INOX": selected.includes("NO_INOX") ? "SI" : "NO",
            FirmaDropbox: report.firmaInfo?.sharedLink || "",
          };
        });
      } else if (reportType === "libro_visitas") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          HoraEntrada: report.horaEntrada || "",
          HoraSalida: report.horaSalida || "",
          NombreApellidos: report.nombreApellidos || "",
          Empresa: report.empresa || "",
          MotivoVisita: report.motivoVisita || "",
          HaLeidoNormas: report.haLeidoNormas || "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "herramientas") {
        dataForExcel = reports.map((report) => {
          const fotosLinks = (report.fotosSubidas || [])
            .filter((f) => f.dropboxPath)
            .map((f) => f.sharedLink || `https://www.dropbox.com/home${encodeURI(f.dropboxPath)}`)
            .join(" ; ");
          return {
            Empleado: getEmployeeName(report),
            Fecha: report.fecha,
            Hora: report.hora,
            TipoRegistro:
              report.tipoRegistro === "MANTENIMIENTO_EXTERNO"
                ? "MANTENIMIENTO EXTERNO"
                : "HERRAMIENTAS ENVASADORAS (SEMANAL)",
            EmpresaTecnico: report.empresaTecnico || "",
            Kit: report.kit || "",
            ChecklistEntrada: report.checklistEntrada,
            ChecklistSalida: report.checklistSalida,
            RutaFotos: fotosLinks,
            NoConformidad: report.noConformidad,
            FirmaDropbox: report.firmaSubida?.sharedLink || "",
          };
        });
      } else if (reportType === "inicial") {
        dataForExcel = reports.map((report) => ({
            Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          InstalacionesLimpias: report.instalacionesLimpias || "",
          ManipuladoresUniformados: report.manipuladoresUniformados || "",
          PeloProtegido: report.peloProtegido || "",
          UnasLimpias: report.unasLimpias || "",
          ElementosTamiz: report.elementosTamiz || "",
          CalibracionPHMetro: report.calibracionPHMetro || "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "envasado") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          ParadasEmergencia: report.checklist?.paradasEmergencia || report.paradasEmergencia || "",
          IntegridadBoquillas: report.checklist?.integridadBoquillas || report.integridadBoquillas || "",
          FechaLoteImpresos: report.checklist?.fechaLoteImpresos || report.fechaLoteImpresos || "",
          FechaLoteLegibles: report.checklist?.fechaLoteLegibles || report.fechaLoteLegibles || "",
          EnvasesCierran: report.checklist?.envasesCierran || report.envasesCierran || "",
          EtiquetaCorrecta: report.checklist?.etiquetaCorrecta || report.etiquetaCorrecta || "",
          UnidadesCaja: report.checklist?.unidadesCaja || report.unidadesCaja || "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "limpieza") {
        dataForExcel = reports.map((report) => ({
            Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          ControlSuperficies: report.controlSuperficies ? "Correcto" : "Incorrecto",
          DesengrasantePorLitro: report.desengrasantePorLitro ?? "",
          DesinfectantePorLitro: report.desinfectantePorLitro ?? "",
          PhAclarado: report.phAclarado ?? "",
          PhGrifo: report.phGrifo ?? "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "limpieza_planta") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          Zona: (report.zonaNombre || report.zona) ?? "",
          Periodo: report.periodo || "SEMANAL",
          LimpiezaCompletada: report.limpiezaCompletada ? "Sí" : "No",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "recepcion_salida") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          TipoMovimiento: report.tipoMovimiento === "E" ? "Entrada" : "Salida",
          Empresa: report.empresa || "",
          NombreTransportista: report.nombreTransportista || "",
          DNIMatricula: report.dniMatricula || "",
          Fecha: report.fecha,
          Hora: report.hora,
          Producto: report.producto || "",
          IdentificacionProducto:
            report.identificacionProducto === "SI"
              ? "SI"
              : report.identificacionProducto === "NO"
                ? "NO"
                : report.identificacionProducto
                  ? "SI"
                  : "NO",
          EstadoCajas: report.estadoCajas || "",
          Bultos: report.bultos || "",
          Palets: report.palets || "",
          Temperatura: report.temperatura || "",
          HigieneCamion: report.higieneCamion || "",
          EstadoPalets: report.estadoPalets || "",
          Aceptado: report.aceptado || "",
          QuienRecepciona: report.quienRecepciona || "",
          NombreConductor: report.nombreConductor || "",
          NumeroAlbaran: report.numeroAlbaran || "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "control_residuos") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          PaletsCarton: report.paletsCarton ?? "",
          PaletsPlastico: report.paletsPlastico ?? "",
          PaletsFilm: report.paletsFilm ?? "",
          Responsable: report.nombreResponsable || "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "control_expedicion") {
        dataForExcel = reports.map((report) => ({
          Id: report.id,
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          Producto: report.producto ?? "",
          Lote: report.lote ?? "",
          NumeroPalet: report.numeroPalet ?? "",
          PaletIntegro: report.paletIntegro ?? "",
          FlejadoOK: report.flejadoOK ?? "",
          EtiquetaCorrecta: report.etiquetaCorrecta ?? "",
          ConteoCorrecto: report.conteoCorrecto ?? "",
          Responsable: report.responsable ?? "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
          CreatedAt: report.createdAt ? new Date(report.createdAt).toISOString() : "",
          UpdatedAt: report.updatedAt ? new Date(report.updatedAt).toISOString() : "",
        }));
      } else if (reportType === "control_agua_diario") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          "Temperatura Calentador (&ge;60ºC)": report.temperaturaCalentador ?? "",
          "Cloro Depósito (0,2-1 PPM)": report.cloroDeposito ?? "",
          "pH Depósito (6,5-8,5)": report.phDeposito ?? "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "control_agua_semanal") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          "Turbidez Calentador (<4 UNF)": report.turbidezCalentador ?? "",
          "Turbidez Depósito (<4 UNF)": report.turbidezDeposito ?? "",
          "Purga Puntos Poco Uso (Tº &ge; 50 ºC)": report.purgaPuntos ?? "",
          "Turbidez Puntos Terminales (<4 UNF)": report.turbidezPuntos ?? "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "control_agua_mensual") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          "Suciedad o Corrosión": report.suciedadCorrosion ?? "",
          "Tº < 20 ºC (fría)": report.tempFria ?? "",
          "Tº &ge; 50 ºC (caliente)": report.tempCaliente ?? "",
          "Cloro 0,2-1": report.cloroPuntos ?? "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "control_agua_trimestral") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          "Suciedad o Corrosión": report.suciedadCorrosion ?? "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "satisfaccion") {
        dataForExcel = reports.map((report) => ({
          Id: report.id,
          Cliente: report.cliente || "",
          Contacto: report.contacto || "",
          Email: report.email || "",
          Telefono: report.telefono || "",
          Canal: report.canal || "",
          Fecha: report.fecha || "",
          ISG: report.isg ?? "",
          Valora: report.valoras || "",
          Mejoras: report.mejoras || "",
          Comentarios: report.comentarios || "",
          A1: report.scores?.a1 || "",
          A2: report.scores?.a2 || "",
          A3: report.scores?.a3 || "",
          A4: report.scores?.a4 || "",
          A5: report.scores?.a5 || "",
          B1: report.scores?.b1 || "",
          B2: report.scores?.b2 || "",
          B3: report.scores?.b3 || "",
          B4: report.scores?.b4 || "",
          C1: report.scores?.c1 || "",
          C2: report.scores?.c2 || "",
          C3: report.scores?.c3 || "",
          D1: report.scores?.d1 || "",
          D2: report.scores?.d2 || "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
          CreatedAt: report.createdAt ? new Date(report.createdAt).toISOString() : "",
          UpdatedAt: report.updatedAt ? new Date(report.updatedAt).toISOString() : "",
        }));
      }

      const ws = XLSX.utils.json_to_sheet(dataForExcel);
      applyHeaderStyle(ws);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Informes");
      XLSX.writeFile(wb, `informes_${reportType}_${new Date().toISOString().split("T")[0]}.xlsx`);
    };


    return (
      <>
        <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            type="button"
            className="dk-btn dk-btn--primary"
            onClick={exportToExcel}
            style={{ padding: "0.5rem 1rem" }}
          >
            📊 Exportar a Excel
          </button>
          <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
            Total: {reports.length} informe(s)
          </span>
        </div>
        <div className="records-table-wrapper">
          <table className="records-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Fecha</th>
                <th>Hora</th>
                {activeTab === "herramientas" && <th>Tipo</th>}
                {activeTab === "inicial" && <th>Instalaciones</th>}
                {activeTab === "envasado" && <th>Paradas Emergencia</th>}
                {activeTab === "produccion" && <th>Color</th>}
                {activeTab === "peso" && <th>Promedio</th>}
                {activeTab === "limpieza" && <th>Control Superficies</th>}
                {activeTab === "limpieza_planta" && <th>Zona</th>}
                {activeTab === "limpieza_planta" && <th>Periodo</th>}
                {activeTab === "testigos" && <th>Tipo Testigo</th>}
                {activeTab === "libro_visitas" && <th>Motivo Visita</th>}
                {activeTab === "recepcion_salida" && <th>Empresa</th>}
                {activeTab === "recepcion_salida" && <th>Nº Albarán</th>}
                {activeTab === "control_residuos" && <th>Palets Cartón</th>}
                {activeTab === "control_expedicion" && <th>Producto</th>}
                {activeTab === "control_agua_diario" && <th>Temp. Calentador</th>}
                {activeTab === "control_agua_semanal" && <th>Turbidez Calentador</th>}
                {activeTab === "control_agua_mensual" && <th>Suciedad/Corrosión</th>}
                {activeTab === "control_agua_trimestral" && <th>Suciedad/Corrosión</th>}
                {activeTab === "satisfaccion" && <th>Cliente</th>}
                {activeTab === "satisfaccion" && <th>ISG</th>}
                <th style={{ minWidth: "200px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.employee_id}</td>
                  <td>{report.fecha}</td>
                  <td>{report.hora}</td>
                  {activeTab === "herramientas" && (
                    <td>{report.tipoRegistro === "MANTENIMIENTO_EXTERNO" ? "Mantenimiento" : "Herramientas"}</td>
                  )}
                  {activeTab === "inicial" && (
                    <td>{report.instalacionesLimpias}</td>
                  )}
                  {activeTab === "envasado" && (
                    <td>{report.checklist?.paradasEmergencia || "-"}</td>
                  )}
                  {activeTab === "produccion" && (
                    <td>{report.color || "-"}</td>
                  )}
                  {activeTab === "peso" && (
                    <td>{report.promedio ? report.promedio.toFixed(2) : "-"}</td>
                  )}
                  {activeTab === "limpieza" && (
                    <td>{report.controlSuperficies ? "Correcto" : "Incorrecto"}</td>
                  )}
                  {activeTab === "limpieza_planta" && (
                    <td>{report.zonaNombre || report.zona || "-"}</td>
                  )}
                  {activeTab === "limpieza_planta" && (
                    <td>{report.periodo || "SEMANAL"}</td>
                  )}
                  {activeTab === "testigos" && (
                    <td>
                      {Array.isArray(report.tipoTestigo)
                        ? report.tipoTestigo.join(", ")
                        : report.tipoTestigo || "-"}
                    </td>
                  )}
                  {activeTab === "libro_visitas" && (
                    <td>{report.motivoVisita || "-"}</td>
                  )}
                  {activeTab === "recepcion_salida" && (
                    <td>{report.empresa || "-"}</td>
                  )}
                  {activeTab === "recepcion_salida" && (
                    <td>{report.numeroAlbaran || "-"}</td>
                  )}
                  {activeTab === "control_residuos" && (
                    <td>{report.paletsCarton ?? "-"}</td>
                  )}
                  {activeTab === "control_expedicion" && (
                    <td>{report.producto || "-"}</td>
                  )}
                  {activeTab === "control_agua_diario" && (
                    <td>{report.temperaturaCalentador ?? "-"}</td>
                  )}
                  {activeTab === "control_agua_semanal" && (
                    <td>{report.turbidezCalentador ?? "-"}</td>
                  )}
                  {activeTab === "control_agua_mensual" && (
                    <td>{report.suciedadCorrosion ?? "-"}</td>
                  )}
                  {activeTab === "control_agua_trimestral" && (
                    <td>{report.suciedadCorrosion ?? "-"}</td>
                  )}
                  {activeTab === "satisfaccion" && (
                    <td>{report.cliente || "-"}</td>
                  )}
                  {activeTab === "satisfaccion" && (
                    <td>{report.isg ?? "-"}</td>
                  )}
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "nowrap" }}>
                      <button
                        type="button"
                        className="dk-btn dk-btn--ghost"
                        style={{ 
                          padding: "0.5rem 1rem", 
                          fontSize: "0.85rem",
                          minWidth: "85px",
                          backgroundColor: "#ffffff",
                          border: "2px solid rgba(13, 34, 66, 0.3)",
                          fontWeight: "600"
                        }}
                        onClick={() => {
                          setSelectedReport(report);
                          setSelectedReportType(reportType);
                        }}
                      >
                        👁️ Ver
                      </button>
                      <button
                        type="button"
                        className="dk-btn dk-btn--ghost"
                        style={{ 
                          padding: "0.5rem 1rem", 
                          fontSize: "0.85rem",
                          minWidth: "85px",
                          backgroundColor: "#ffffff",
                          border: "2px solid rgba(13, 34, 66, 0.3)",
                          fontWeight: "600"
                        }}
                        onClick={() => {
                          switch (reportType) {
                            case "herramientas":
                              setEditingToolReport(report);
                              break;
                            case "inicial":
                              setEditingInitialReport(report);
                              break;
                            case "envasado":
                              setEditingPackagingReport(report);
                              break;
                            case "produccion":
                              setEditingProductionReport(report);
                              break;
                            case "peso":
                              setEditingWeightReport(report);
                              break;
                            case "limpieza":
                              setEditingCleaningReport(report);
                              break;
                            case "limpieza_planta":
                              setEditingCleaningPlantReport(report);
                              break;
                            case "control_residuos":
                              setEditingControlResiduesReport(report);
                              break;
                            case "control_expedicion":
                              setEditingControlExpeditionReport(report);
                              break;
                            case "control_agua_diario":
                              setEditingControlAguaDiarioReport(report);
                              break;
                            case "control_agua_semanal":
                              setEditingControlAguaSemanalReport(report);
                              break;
                            case "control_agua_mensual":
                              setEditingControlAguaMensualReport(report);
                              break;
                            case "control_agua_trimestral":
                              setEditingControlAguaTrimestralReport(report);
                              break;
                            case "satisfaccion":
                              setEditingSatisfactionForm(report);
                              break;
                          }
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="dk-btn dk-btn--ghost"
                        style={{ 
                          padding: "0.5rem 1rem", 
                          fontSize: "0.85rem", 
                          color: "#c62828",
                          borderColor: "#c62828",
                          borderWidth: "2px",
                          minWidth: "85px",
                          backgroundColor: "#ffffff",
                          fontWeight: "600"
                        }}
                        onClick={() => {
                          setDeletingReportId(report.id);
                          setDeletingReportType(reportType);
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  // Vista específica para el usuario de informes
  if (user && role === "informes") {
    return (
      <div className="app-shell">
        <header className="hero">
          <div className="hero__brand">
            <BrandLogo />
            <div>
              <p className="eyebrow">Plataforma interna</p>
              <h1>
                Módulo de <span>Informes</span>
              </h1>
              <p>
                Selecciona el tipo de informe que quieres elaborar o consultar.
              </p>
            </div>
            <div className="hero__session">
              <span>{user.nombre || user.usuario}</span>
              <button type="button" className="dk-btn dk-btn--logout" onClick={logout}>
                Salir
              </button>
            </div>
          </div>
        </header>

        <main className="dashboard">
          <section className="panel">
            <div className="panel__header">
              <h2>Menú de informes</h2>
              <p>Elige el tipo de informe que deseas crear.</p>
            </div>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "1rem",
              marginTop: "1.5rem"
            }}>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "CONTROL_HERRAMIENTAS" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => {
                  setSelectedInforme("CONTROL_HERRAMIENTAS");
                  setShowToolRegistration(true);
                }}
              >
                🔧 Control de herramientas
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "INICIAL" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("INICIAL")}
              >
                📋 Inicial
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "ENVASADO" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("ENVASADO")}
              >
                📦 Envasado
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "PRODUCCION" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("PRODUCCION")}
              >
                🏭 Producción
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "PESO_PRODUCTO" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("PESO_PRODUCTO")}
              >
                ⚖️ Peso producto
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "LIMPIEZA" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("LIMPIEZA")}
              >
                🧹 Limpieza
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "LIMPIEZA_PLANTA" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("LIMPIEZA_PLANTA")}
              >
                🏭 Limpieza Planta
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "LIBRO_VISITAS" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("LIBRO_VISITAS")}
              >
                📖 Libro de visitas
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "RECEPCION_SALIDA" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("RECEPCION_SALIDA")}
              >
                🚚 Recepción / salida mercancía
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "CONTROL_RESIDUOS" ? " is-active" : ""}`}
                style={{
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("CONTROL_RESIDUOS")}
              >
                ♻️ Control de residuos
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "TESTIGOS" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("TESTIGOS")}
              >
                🧲 Registro de Testigos
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${selectedInforme === "CONTROL_EXPEDICION" ? " is-active" : ""}`}
                style={{ 
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setSelectedInforme("CONTROL_EXPEDICION")}
              >
                📦 Control de expedición
              </button>
              <button
                type="button"
                className={`dk-btn dk-btn--primary${["CONTROL_AGUA_DIARIO", "CONTROL_AGUA_SEMANAL", "CONTROL_AGUA_MENSUAL"].includes(selectedInforme) ? " is-active" : ""}`}
                style={{
                  padding: "1.5rem 1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => setShowControlAguaSelector(true)}
              >
                💧 Control agua
              </button>
            </div>
            {selectedInforme === "INICIAL" && (
              <InitialReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "ENVASADO" && (
              <PackagingReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "PRODUCCION" && (
              <ProductionReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "PESO_PRODUCTO" && (
              <WeightReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                pendingReport={pendingWeightReport}
                onDraftStateChange={refreshPendingWeightReport}
                onNotify={notify}
                onConfirm={confirmAction}
              />
            )}
            {selectedInforme === "LIMPIEZA" && (
              <CleaningReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "LIMPIEZA_PLANTA" && (
              <CleaningPlantReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "LIBRO_VISITAS" && (
              <VisitorsBookReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "RECEPCION_SALIDA" && (
              <ReceptionExitReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "CONTROL_RESIDUOS" && (
              <ControlResiduesReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "TESTIGOS" && (
              <WitnessReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "CONTROL_EXPEDICION" && (
              <ControlExpeditionReport
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "CONTROL_AGUA_DIARIO" && (
              <ControlAguaDiario
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "CONTROL_AGUA_SEMANAL" && (
              <ControlAguaSemanal
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "CONTROL_AGUA_MENSUAL" && (
              <ControlAguaMensual
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme === "CONTROL_AGUA_TRIMESTRAL" && (
              <ControlAguaTrimestral
                onClose={() => setSelectedInforme(null)}
                user={user}
                apiBase={apiBase}
                onNotify={notify}
              />
            )}
            {selectedInforme &&
              !["CONTROL_HERRAMIENTAS", "INICIAL", "ENVASADO", "PRODUCCION", "PESO_PRODUCTO", "LIMPIEZA", "LIMPIEZA_PLANTA", "LIBRO_VISITAS", "RECEPCION_SALIDA", "TESTIGOS", "CONTROL_RESIDUOS", "CONTROL_EXPEDICION", "CONTROL_AGUA_DIARIO", "CONTROL_AGUA_SEMANAL", "CONTROL_AGUA_MENSUAL", "CONTROL_AGUA_TRIMESTRAL"].includes(selectedInforme) && (
                <p style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "8px", color: "#64748b" }}>
                  El informe <strong>{selectedInforme.replace("_", " ")}</strong> se mostrará aquí cuando esté implementado.
                </p>
              )}
          </section>
        </main>

        <footer className="app-footer">
          <BrandLogo />
          <p>© {new Date().getFullYear()} DK Tegoria · Módulo de informes</p>
        </footer>

        {showToolRegistration && (
          <ToolRegistration
            onClose={() => setShowToolRegistration(false)}
            user={user}
            apiBase={apiBase}
            onNotify={notify}
          />
        )}

        {showControlAguaSelector && (
          <div className="modal-overlay" onClick={() => setShowControlAguaSelector(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Control Agua</h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowControlAguaSelector(false)}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p>Selecciona el tipo de control que quieres realizar.</p>
                <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="dk-btn dk-btn--primary"
                    onClick={() => {
                      setSelectedInforme("CONTROL_AGUA_DIARIO");
                      setShowControlAguaSelector(false);
                    }}
                  >
                    Control agua diario
                  </button>
                  <button
                    type="button"
                    className="dk-btn dk-btn--primary"
                    onClick={() => {
                      setSelectedInforme("CONTROL_AGUA_SEMANAL");
                      setShowControlAguaSelector(false);
                    }}
                  >
                    Control agua semanal
                  </button>
                  <button
                    type="button"
                    className="dk-btn dk-btn--primary"
                    onClick={() => {
                      setSelectedInforme("CONTROL_AGUA_MENSUAL");
                      setShowControlAguaSelector(false);
                    }}
                  >
                    Control agua mensual
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <Login />
      </div>
    );
  }

  // Aplica estilo de cabecera (fondo azul oscuro, texto blanco) a la primera fila de una hoja
  const applyHeaderStyle = (worksheet) => {
    if (!worksheet || !worksheet["!ref"]) return;
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ c: C, r: 0 });
      const cell = worksheet[address];
      if (!cell) continue;
      cell.s = {
        fill: {
          patternType: "solid",
          fgColor: { rgb: "012B5C" }, // azul oscuro
        },
        font: {
          color: { rgb: "FFFFFF" }, // blanco
          bold: true,
        },
      };
    }
  };

  const exportToExcel = () => {
    if (adminRecords.length === 0) {
      notify("warning", "No hay registros para exportar.");
      return;
    }

    // Preparar los datos para Excel
    const excelData = adminRecords.map((record) => ({
      Empleado: record.employee_id,
      Fecha: record.date,
      Entrada: record.check_in ? new Date(record.check_in).toLocaleTimeString() : "-",
      Salida: record.check_out ? new Date(record.check_out).toLocaleTimeString() : "-",
      Horas: record.worked_hours ?? "-",
      Estado: record.status,
    }));

    // Crear el libro de trabajo
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    applyHeaderStyle(worksheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");

    // Generar el nombre del archivo con la fecha actual
    const fecha = new Date().toISOString().split("T")[0];
    const fileName = `historial_trabajadores_${fecha}.xlsx`;

    // Descargar el archivo
    XLSX.writeFile(workbook, fileName);
  };

  const handleWorkerAction = async (action) => {
    // Validar que no haya entrada pendiente antes de registrar nueva entrada
    if (action === "in" && hasPendingEntry) {
      setWorkerMessage({
        type: "error",
        text: "Ya tienes una entrada registrada. Debes registrar la salida antes de poder registrar una nueva entrada.",
      });
      return;
    }

    setWorkerLoading(action);
    setWorkerMessage(null);
    try {
      const endpoint = action === "in" ? "createEntry" : "completeEntry";
      const response = await fetch(`${apiBase}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: user.usuario }),
      });
      
      let payload;
      try {
        payload = await response.json();
      } catch (parseError) {
        if (response.ok) {
          setWorkerMessage({
            type: "success",
            text:
              action === "in"
                ? "Entrada registrada correctamente."
                : "Salida registrada correctamente.",
          });
          return;
        }
        throw new Error("Error al procesar la respuesta del servidor");
      }
      
      if (!response.ok) {
        const errorMsg =
          payload.error === "ENTRY_NOT_FOUND"
            ? "No se encontró una entrada pendiente. Asegúrate de registrar la entrada primero."
            : payload.message || payload.error || "No se pudo registrar";
        throw new Error(errorMsg);
      }
      
      setWorkerMessage({
        type: "success",
        text:
          action === "in"
            ? "Entrada registrada correctamente."
            : "Salida registrada correctamente.",
      });
      
      // Actualizar el estado de entrada pendiente después de la acción
      if (action === "in") {
        setHasPendingEntry(true);
      } else if (action === "out") {
        setHasPendingEntry(false);
      }
    } catch (error) {
      setWorkerMessage({
        type: "error",
        text: error.message || "Error inesperado",
      });
    } finally {
      setWorkerLoading(null);
    }
  };

  if (role !== "admin") {
    return (
      <div className="worker-screen">
        <div className="worker-panel">
          <BrandLogo />
          <div className="worker-panel__info">
            <p className="eyebrow">Modo trabajador</p>
            <h1>Hola, {user.nombre || user.usuario}</h1>
            <p>Registra tus movimientos al iniciar y finalizar el turno.</p>
          </div>
          <div className="worker-panel__actions">
            <button
              type="button"
              className="dk-btn dk-btn--primary"
              onClick={() => handleWorkerAction("in")}
              disabled={workerLoading === "in" || hasPendingEntry}
            >
              {workerLoading === "in" ? "Registrando..." : "Registrar entrada"}
            </button>
            <button
              type="button"
              className="dk-btn dk-btn--secondary"
              onClick={() => handleWorkerAction("out")}
              disabled={workerLoading === "out"}
            >
              {workerLoading === "out" ? "Registrando..." : "Registrar salida"}
            </button>
          </div>
          {workerMessage && (
            <p
              className={`worker-panel__message worker-panel__message--${workerMessage.type}`}
            >
              {workerMessage.text}
            </p>
          )}
          <button type="button" className="dk-btn dk-btn--ghost" onClick={logout}>
            Salir
          </button>
        </div>
        {renderNotifications()}
      </div>
    );
  }

  const reportTabs = [
    { id: "herramientas", label: "🔧 Herramientas" },
    { id: "inicial", label: "📋 Inicial" },
    { id: "envasado", label: "📦 Envasado" },
    { id: "produccion", label: "🏭 Producción" },
    { id: "peso", label: "⚖️ Peso Producto" },
    { id: "limpieza", label: "🧹 Limpieza" },
    { id: "limpieza_planta", label: "🏭 Limpieza Planta" },
    { id: "testigos", label: "🧲 Testigos" },
    { id: "libro_visitas", label: "📖 Libro visitas" },
    { id: "recepcion_salida", label: "🚚 Recepción/Salida" },
    { id: "control_residuos", label: "♻️ Control residuos" },
    { id: "control_expedicion", label: "📦 Control expedición" },
    { id: "control_agua_diario", label: "💧 Control agua diario" },
    { id: "control_agua_semanal", label: "💧 Control agua semanal" },
    { id: "control_agua_mensual", label: "💧 Control agua mensual" },
    { id: "control_agua_trimestral", label: "💧 Control agua trimestral" },
    { id: "satisfaccion", label: "😊 Satisfacción cliente" },
  ];

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__brand">
          <BrandLogo />
          <div>
            <p className="eyebrow">Plataforma interna</p>
            <h1>
              Registro de horas <span>DK Tegoria</span>
            </h1>
            <p>
              Controla entradas y salidas desde un panel claro, pensado para tus
              supervisores y equipo administrativo.
            </p>
          </div>
          <div className="hero__session">
            <span>{user.nombre || user.usuario}</span>
            <button type="button" className="dk-btn dk-btn--logout" onClick={logout}>
              Salir
            </button>
          </div>
        </div>

        <div className="hero__summary">
          <article className="summary-card summary-card--primary">
            <p>Colaboradores activos</p>
            <strong>{statsLoading ? "..." : stats.activeEmployees}</strong>
          </article>
          <article className="summary-card summary-card--accent">
            <p>Horas registradas hoy</p>
            <strong>{statsLoading ? "..." : `${stats.hoursToday}h`}</strong>
          </article>
          <article className="summary-card summary-card--warning">
            <p>Horas acumuladas</p>
            <strong>
              {adminLoading ? "..." : `${totalWorkedHours}h`}
            </strong>
          </article>
        </div>
      </header>

      <main className="dashboard">
        <section className="panel">
          <div className="panel__header">
            <h2>Registros pendientes</h2>
            <p>Entradas sin salida registrada.</p>
          </div>
          {adminLoading && <p>Cargando registros...</p>}
          {adminError && <p className="panel__error">{adminError}</p>}
          {!adminLoading && !adminError && (
            <div 
              className="records-table-wrapper"
              style={{ maxHeight: "600px", overflowY: "auto" }}
              onScroll={(e) => {
                const target = e.target;
                const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                if (scrollBottom < 100 && pendingRecordsLimit < pendingRecords.length) {
                  setPendingRecordsLimit(prev => Math.min(prev + 10, pendingRecords.length));
                }
              }}
            >
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Notas</th>
                    <th style={{ minWidth: "180px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRecords.length === 0 ? (
                    <tr>
                      <td colSpan="5">No hay registros pendientes.</td>
                    </tr>
                  ) : (
                    pendingRecords.slice(0, pendingRecordsLimit).map((record) => (
                      <tr key={`${record.id}-pending`}>
                        <td>{record.employee_id}</td>
                        <td>{record.date}</td>
                        <td>
                          {record.check_in
                            ? new Date(record.check_in).toLocaleTimeString()
                            : "-"}
                        </td>
                        <td>{record.notes || "-"}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              flexWrap: "nowrap",
                              alignItems: "center",
                            }}
                          >
                            <button
                              type="button"
                              className="dk-btn dk-btn--ghost"
                              style={{
                                padding: "0.4rem 0.8rem",
                                fontSize: "0.8rem",
                                minWidth: "80px",
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                                backgroundColor: "#ffffff",
                                border: "2px solid rgba(13, 34, 66, 0.3)",
                                fontWeight: "600",
                              }}
                              onClick={() => setEditingRecord(record)}
                              aria-label="Editar registro pendiente"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              className="dk-btn dk-btn--ghost"
                              style={{
                                padding: "0.4rem 0.8rem",
                                fontSize: "0.8rem",
                                minWidth: "80px",
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                                backgroundColor: "#ffffff",
                                color: "#c62828",
                                borderColor: "#c62828",
                                borderWidth: "2px",
                                fontWeight: "600",
                              }}
                              onClick={() => setDeletingRecordId(record.id)}
                              aria-label="Eliminar registro pendiente"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {pendingRecords.length > pendingRecordsLimit && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "1rem", color: "#64748b", fontStyle: "italic" }}>
                        Mostrando {pendingRecordsLimit} de {pendingRecords.length} registros. Desplázate para ver más...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__header">
            <div className="panel__header-top">
              <div>
                <h2>Historial de trabajadores</h2>
                <p>Últimos movimientos registrados.</p>
              </div>
              <button
                type="button"
                className="dk-btn dk-btn--export"
                onClick={exportToExcel}
                disabled={adminRecords.length === 0}
              >
                📊 Exportar Excel
              </button>
            </div>
          </div>
          {adminLoading && <p>Cargando registros...</p>}
          {adminError && <p className="panel__error">{adminError}</p>}
          {!adminLoading && !adminError && (
            <>
              {adminRecords.length > 0 && (
                <div style={{ 
                  marginBottom: "1rem", 
                  padding: "1rem", 
                  backgroundColor: "#f8fafc", 
                  borderRadius: "12px",
                  border: "2px solid #e6eaf3",
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "center"
                }}>
                  <span style={{ fontWeight: "700", color: "#0c3c7c", fontSize: "0.95rem", marginRight: "0.5rem" }}>⚡ Acciones rápidas:</span>
                  <button
                    type="button"
                    className="dk-btn dk-btn--primary"
                    style={{ 
                      padding: "0.6rem 1.2rem", 
                      fontSize: "0.9rem"
                    }}
                    onClick={() => {
                      if (adminRecords.length > 0) {
                        setEditingRecord(adminRecords[0]);
                      }
                    }}
                    disabled={adminRecords.length === 0}
                  >
                    ✏️ Editar primer registro
                  </button>
                  <span style={{ color: "#64748b", fontSize: "0.85rem", fontStyle: "italic" }}>
                    (Usa los botones en cada fila para acciones específicas)
                  </span>
                </div>
              )}
              <div 
                className="records-table-wrapper"
                style={{ maxHeight: "600px", overflowY: "auto" }}
                onScroll={(e) => {
                  const target = e.target;
                  const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                  if (scrollBottom < 100 && historyRecordsLimit < completedRecords.length) {
                    setHistoryRecordsLimit(prev => Math.min(prev + 10, completedRecords.length));
                  }
                }}
              >
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Fecha</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Horas</th>
                      <th>Estado</th>
                      <th style={{ minWidth: "200px" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRecords.length === 0 ? (
                      <tr>
                        <td colSpan="7">No hay registros recientes.</td>
                      </tr>
                    ) : (
                      completedRecords.slice(0, historyRecordsLimit).map((record) => (
                        <tr key={record.id}>
                          <td>{record.employee_id}</td>
                          <td>{record.date}</td>
                          <td>{record.check_in ? new Date(record.check_in).toLocaleTimeString() : "-"}</td>
                          <td>{record.check_out ? new Date(record.check_out).toLocaleTimeString() : "-"}</td>
                          <td>{record.worked_hours ?? "-"}</td>
                          <td>{record.status}</td>
                          <td>
                            <div style={{ 
                              display: "flex", 
                              gap: "0.5rem", 
                              flexWrap: "nowrap", 
                              alignItems: "center"
                            }}>
                              <button
                                type="button"
                                className="dk-btn dk-btn--ghost"
                                style={{ 
                                  padding: "0.5rem 1rem", 
                                  fontSize: "0.85rem",
                                  minWidth: "85px",
                                  flexShrink: 0,
                                  whiteSpace: "nowrap",
                                  backgroundColor: "#ffffff",
                                  border: "2px solid rgba(13, 34, 66, 0.3)",
                                  fontWeight: "600"
                                }}
                                onClick={() => setEditingRecord(record)}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                type="button"
                                className="dk-btn dk-btn--ghost"
                                style={{ 
                                  padding: "0.5rem 1rem", 
                                  fontSize: "0.85rem", 
                                  color: "#c62828",
                                  borderColor: "#c62828",
                                  borderWidth: "2px",
                                  minWidth: "85px",
                                  flexShrink: 0,
                                  whiteSpace: "nowrap",
                                  backgroundColor: "#ffffff",
                                  fontWeight: "600"
                                }}
                                onClick={() => setDeletingRecordId(record.id)}
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                    {completedRecords.length > historyRecordsLimit && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "1rem", color: "#64748b", fontStyle: "italic" }}>
                          Mostrando {historyRecordsLimit} de {completedRecords.length} registros. Desplázate para ver más...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Sección dedicada para Limpieza Planta */}
        <section className="panel" style={{ border: "2px solid #012b5c", backgroundColor: "#f8fafc" }}>
          <div className="panel__header">
            <h2 style={{ color: "#012b5c", fontSize: "1.5rem" }}>🏭 Gestión de Limpieza Planta</h2>
            <p>Visualiza, edita y elimina informes de limpieza organizados por zonas.</p>
          </div>

          {/* Filtro por zona */}
          <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <label htmlFor="limpieza-planta-zona-filter" style={{ display: "block", marginBottom: "0.5rem", color: "#475569", fontWeight: "600" }}>
                Filtrar por zona
              </label>
              <select
                id="limpieza-planta-zona-filter"
                value={limpiezaPlantaZonaFilter}
                onChange={(e) => setLimpiezaPlantaZonaFilter(e.target.value)}
                style={{
                  padding: "0.65rem 0.9rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 500,
                  minWidth: "200px"
                }}
              >
                <option value="TODAS">Todas las zonas</option>
                {LIMPIEZA_PLANTA_ZONAS.map((zona) => (
                  <option key={zona.id} value={zona.id}>
                    {zona.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <button
                type="button"
                className="dk-btn dk-btn--export"
                onClick={() => {
                  setActiveTab("limpieza_planta");
                  // Los datos ya están cargados automáticamente
                }}
                style={{ backgroundColor: "#012b5c", borderColor: "#012b5c" }}
              >
                📊 Exportar Excel
              </button>
            </div>
          </div>

          {/* Tabla de limpieza planta */}
          {reportsLoading && <p>Cargando informes de limpieza...</p>}
          {reportsError && (
            <div className="panel__error">
              <p>Error al cargar informes: {reportsError}</p>
              <button
                type="button"
                className="dk-btn dk-btn--ghost"
                onClick={() => fetchReportsByType("limpieza_planta")}
                style={{ marginTop: "0.5rem" }}
              >
                Reintentar
              </button>
            </div>
          )}
          {!reportsLoading && !reportsError && cleaningPlantReports.length > 0 && (
            <div className="records-table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Zona</th>
                    <th>Periodo</th>
                    <th>Completada</th>
                    <th style={{ minWidth: "250px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredReports = limpiezaPlantaZonaFilter === "TODAS"
                      ? cleaningPlantReports
                      : cleaningPlantReports.filter(report =>
                          (report.zonaNombre || report.zona) === limpiezaPlantaZonaFilter ||
                          LIMPIEZA_PLANTA_ZONAS.find(z => z.id === limpiezaPlantaZonaFilter)?.nombre === (report.zonaNombre || report.zona)
                        );

                    return filteredReports.map((report) => (
                      <tr key={report.id}>
                        <td>{report.employee_id}</td>
                        <td>{report.fecha}</td>
                        <td>{report.hora}</td>
                        <td>{report.zonaNombre || report.zona || "-"}</td>
                        <td>{report.periodo || "SEMANAL"}</td>
                        <td>
                          <span style={{
                            color: report.limpiezaCompletada ? "#10b981" : "#ef4444",
                            fontWeight: "600"
                          }}>
                            {report.limpiezaCompletada ? "✅ Sí" : "❌ No"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="dk-btn dk-btn--ghost"
                              style={{
                                padding: "0.5rem 1rem",
                                fontSize: "0.85rem",
                                minWidth: "85px",
                                backgroundColor: "#ffffff",
                                border: "2px solid rgba(13, 34, 66, 0.3)",
                                fontWeight: "600"
                              }}
                              onClick={() => {
                                setSelectedReport(report);
                                setSelectedReportType("limpieza_planta");
                              }}
                            >
                              👁️ Ver
                            </button>
                            <button
                              type="button"
                              className="dk-btn dk-btn--ghost"
                              style={{
                                padding: "0.5rem 1rem",
                                fontSize: "0.85rem",
                                minWidth: "85px",
                                backgroundColor: "#ffffff",
                                border: "2px solid rgba(13, 34, 66, 0.3)",
                                fontWeight: "600"
                              }}
                              onClick={() => setEditingCleaningPlantReport(report)}
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              className="dk-btn dk-btn--ghost"
                              style={{
                                padding: "0.5rem 1rem",
                                fontSize: "0.85rem",
                                color: "#c62828",
                                borderColor: "#c62828",
                                borderWidth: "2px",
                                minWidth: "85px",
                                backgroundColor: "#ffffff",
                                fontWeight: "600"
                              }}
                              onClick={() => {
                                setDeletingReportId(report.id);
                                setDeletingReportType("limpieza_planta");
                              }}
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                  {cleaningPlantReports.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                        No hay informes de limpieza registrados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Mensaje para cuando no hay datos */}
          {!reportsLoading && !reportsError && cleaningPlantReports.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
              <p>No hay informes de limpieza registrados aún.</p>
              <p>Los empleados pueden crear informes desde la sección de formularios.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2>Gestión de Informes</h2>
            <p>Visualiza, edita, elimina y exporta todos los informes.</p>
          </div>
          
          {/* Selector de informes */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="admin-report-select" style={{ display: "block", marginBottom: "0.5rem", color: "#475569" }}>
              Selecciona el informe
            </label>
            <select
              id="admin-report-select"
              value={activeTab || ""}
              onChange={(event) => {
                const selected = event.target.value;
                setActiveTab(selected);
                fetchReportsByType(selected);
              }}
              style={{
                width: "100%",
                maxWidth: "360px",
                padding: "0.65rem 0.9rem",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#0f172a",
                fontWeight: 500,
              }}
            >
              <option value="" disabled>
                Selecciona...
              </option>
              {reportTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contenido de las pestañas */}
          {reportsLoading && <p>Cargando informes...</p>}
          {reportsError && (
            <div className="panel__error">
              <p>Error al cargar informes: {reportsError}</p>
              <button 
                type="button" 
                className="dk-btn dk-btn--ghost" 
                onClick={() => fetchReportsByType(activeTab)}
                style={{ marginTop: "0.5rem" }}
              >
                Reintentar
              </button>
            </div>
          )}
          {!reportsLoading && !reportsError && renderReportsTable()}
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2>Control semanal</h2>
            <p>Recuento semanal de informes y desviaciones.</p>
          </div>

          <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="dk-btn dk-btn--primary"
              onClick={() => setShowWeeklyExportModal(true)}
              style={{ padding: "0.5rem 1rem" }}
              disabled={weeklySummaryLoading || weeklySummaryRows.length === 0}
            >
              📊 Exportar control semanal
            </button>
            <button
              type="button"
              className="dk-btn dk-btn--ghost"
              onClick={fetchWeeklySummary}
              style={{ padding: "0.5rem 1rem" }}
              disabled={weeklySummaryLoading}
            >
              {weeklySummaryLoading ? "Actualizando..." : "Actualizar"}
            </button>
            {weeklySummaryMeta && (
              <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                Semana: {formatDate(weeklySummaryMeta.start)} – {formatDate(weeklySummaryMeta.end)}
              </span>
            )}
          </div>

          {weeklySummaryError && (
            <div className="panel__error">
              <p>Error al cargar el control semanal: {weeklySummaryError}</p>
            </div>
          )}

          {!weeklySummaryLoading && !weeklySummaryError && weeklySummaryRows.length > 0 && (
            <div className="records-table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Área controlada</th>
                    <th>Registros real</th>
                    <th>Desviaciones</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySummaryRows.map((row) => (
                    <tr key={row.area}>
                      <td>{row.area}</td>
                      <td>{row.registros}</td>
                      <td>{row.desviaciones.count}</td>
                      <td>{row.desviaciones.count > 0 ? "NO CONFORME" : "CONFORME"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>

      <footer className="app-footer">
        <BrandLogo />
        <p>© {new Date().getFullYear()} DK Tegoria · Plataforma de horas</p>
        <div className="footer-links">
          <a href="#politicas">Políticas internas</a>
          <a href="#soporte">Soporte</a>
        </div>
      </footer>

      {showControlAguaSelector && (
        <div className="modal-overlay" onClick={() => setShowControlAguaSelector(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Control Agua</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowControlAguaSelector(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Selecciona el tipo de control que quieres realizar.</p>
              <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="dk-btn dk-btn--primary"
                  onClick={() => {
                    setSelectedInforme("CONTROL_AGUA_DIARIO");
                    setShowControlAguaSelector(false);
                  }}
                >
                  Control agua diario
                </button>
                <button
                  type="button"
                  className="dk-btn dk-btn--primary"
                  onClick={() => {
                    setSelectedInforme("CONTROL_AGUA_SEMANAL");
                    setShowControlAguaSelector(false);
                  }}
                >
                  Control agua semanal
                </button>
                <button
                  type="button"
                  className="dk-btn dk-btn--primary"
                  onClick={() => {
                    setSelectedInforme("CONTROL_AGUA_MENSUAL");
                    setShowControlAguaSelector(false);
                  }}
                >
                  Control agua mensual
                </button>
                <button
                  type="button"
                  className="dk-btn dk-btn--primary"
                  onClick={() => {
                    setSelectedInforme("CONTROL_AGUA_TRIMESTRAL");
                    setShowControlAguaSelector(false);
                  }}
                >
                  Control agua trimestral
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="modal-overlay" onClick={() => {
          setSelectedReport(null);
          setSelectedReportType(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalles del Informe</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setSelectedReport(null);
                  setSelectedReportType(null);
                }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="report-details">
                <div className="report-detail-item">
                  <strong>Empleado:</strong>
                  <span>{selectedReport.employee_id}</span>
                </div>
                <div className="report-detail-item">
                  <strong>Fecha:</strong>
                  <span>{selectedReport.fecha}</span>
                </div>
                <div className="report-detail-item">
                  <strong>Hora:</strong>
                  <span>{selectedReport.hora}</span>
                </div>
                {selectedReportType === "herramientas" && (
                  <>
                    <div className="report-detail-item">
                      <strong>Tipo de Registro:</strong>
                      <span>
                        {selectedReport.tipoRegistro === "MANTENIMIENTO_EXTERNO"
                          ? "MANTENIMIENTO EXTERNO"
                          : "HERRAMIENTAS ENVASADORAS (SEMANAL)"}
                      </span>
                    </div>
                    {selectedReport.empresaTecnico && (
                      <div className="report-detail-item">
                        <strong>Empresa/Técnico:</strong>
                        <span>{selectedReport.empresaTecnico}</span>
                      </div>
                    )}
                    {selectedReport.kit && (
                      <div className="report-detail-item">
                        <strong>Kit:</strong>
                        <span>{selectedReport.kit.replace(/_/g, " ")}</span>
                      </div>
                    )}
                    <div className="report-detail-item">
                      <strong>Checklist Entrada:</strong>
                      <span>{selectedReport.checklistEntrada}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Checklist Salida:</strong>
                      <span>{selectedReport.checklistSalida}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Carpeta Dropbox creada:</strong>
                      <span>{selectedReport.carpetaDropbox}</span>
                    </div>
                    {selectedReport.carpetaDropboxSeleccionada && (
                      <div className="report-detail-item">
                        <strong>Carpeta Dropbox seleccionada:</strong>
                        <span>{selectedReport.carpetaDropboxSeleccionada}</span>
                      </div>
                    )}
                    {selectedReport.fotosSubidas && selectedReport.fotosSubidas.length > 0 && (
                      <div className="report-detail-item">
                        <strong>Fotos subidas:</strong>
                        <span>{selectedReport.fotosSubidas.length} foto(s)</span>
                        <div style={{ marginTop: "0.5rem" }}>
                          {selectedReport.fotosSubidas.map((foto, index) => (
                            <div key={index} style={{ marginBottom: "0.25rem" }}>
                              <a
                                href={`https://www.dropbox.com/home${foto.dropboxPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#012b5c", textDecoration: "underline", fontSize: "0.9rem" }}
                              >
                                {foto.name}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="report-detail-item">
                      <strong>No Conformidad:</strong>
                      <span
                        className={
                          selectedReport.noConformidad === "SI"
                            ? "badge badge--error"
                            : "badge badge--success"
                        }
                      >
                        {selectedReport.noConformidad}
                      </span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Firma:</strong>
                      <span>
                        {selectedReport.tieneFirma ? (
                          <div style={{ marginTop: "0.5rem" }}>
                            <span style={{ display: "block", marginBottom: "0.75rem", fontWeight: "600", color: "#0c3c7c" }}>✓ Presente</span>
                            {selectedReport.firmaSubida && selectedReport.firmaSubida.uploaded && (
                              <div style={{ marginTop: "0.5rem" }}>
                                <div style={{ marginBottom: "0.75rem" }}>
                                  <a
                                    href={`https://www.dropbox.com/home${selectedReport.firmaSubida.dropboxPath}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ 
                                      color: "#012b5c", 
                                      textDecoration: "underline", 
                                      fontSize: "0.9rem", 
                                      display: "inline-block",
                                      padding: "0.5rem 1rem",
                                      backgroundColor: "#f8fafc",
                                      borderRadius: "6px",
                                      border: "1px solid #e6eaf3"
                                    }}
                                  >
                                    📎 Ver firma en Dropbox: {selectedReport.firmaSubida.name}
                                  </a>
                                </div>
                                <div style={{ 
                                  border: "2px solid #e6eaf3", 
                                  borderRadius: "8px", 
                                  padding: "1rem",
                                  backgroundColor: "#ffffff",
                                  display: "inline-block",
                                  maxWidth: "100%"
                                }}>
                                  <div style={{ 
                                    color: "#64748b", 
                                    fontSize: "0.9rem", 
                                    marginBottom: "0.5rem",
                                    fontStyle: "italic"
                                  }}>
                                    Vista previa de la firma:
                                  </div>
                                  <div style={{
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    padding: "0.5rem",
                                    backgroundColor: "#f8fafc",
                                    minHeight: "100px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#64748b",
                                    position: "relative"
                                  }}>
                                    {selectedReport.firmaSubida.sharedLink ? (
                                      <img
                                        src={selectedReport.firmaSubida.sharedLink}
                                        alt="Firma"
                                        style={{
                                          maxWidth: "400px",
                                          maxHeight: "200px",
                                          display: "block",
                                          border: "1px solid #cbd5e1",
                                          borderRadius: "4px",
                                          backgroundColor: "#ffffff"
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                          const fallback = e.target.nextElementSibling;
                                          if (fallback) fallback.style.display = "block";
                                        }}
                                      />
                                    ) : null}
                                    <div style={{ 
                                      display: selectedReport.firmaSubida.sharedLink ? "none" : "block",
                                      textAlign: "center"
                                    }}>
                                      <a
                                        href={`https://www.dropbox.com/home${selectedReport.firmaSubida.dropboxPath}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ 
                                          color: "#012b5c", 
                                          textDecoration: "underline",
                                          fontSize: "0.95rem"
                                        }}
                                      >
                                        👆 Haz clic para ver la firma en Dropbox
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {selectedReport.firmaSubida && !selectedReport.firmaSubida.uploaded && selectedReport.firmaSubida.error && (
                              <div style={{ 
                                marginTop: "0.5rem", 
                                color: "#c62828", 
                                fontSize: "0.85rem",
                                padding: "0.75rem",
                                backgroundColor: "#fee2e2",
                                borderRadius: "6px",
                                border: "1px solid #fecaca"
                              }}>
                                ⚠️ Error al subir: {selectedReport.firmaSubida.error}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#64748b" }}>No proporcionada</span>
                        )}
                      </span>
                    </div>
                  </>
                )}
                {selectedReportType === "limpieza_planta" && (
                  <>
                    <div className="report-detail-item">
                      <strong>Zona:</strong>
                      <span>{(selectedReport.zonaNombre || selectedReport.zona) ?? "-"}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Periodo:</strong>
                      <span>{selectedReport.periodo || "SEMANAL"}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Limpieza completada:</strong>
                      <span>{selectedReport.limpiezaCompletada ? "Sí" : "No"}</span>
                    </div>
                    {selectedReport.checklist && selectedReport.checklist.length > 0 && (
                      <div className="report-detail-item">
                        <strong>Checklist de limpieza:</strong>
                        <div style={{ marginTop: "0.5rem" }}>
                          {selectedReport.checklist.map((item, index) => (
                            <div key={index} style={{ 
                              display: "flex", 
                              alignItems: "flex-start", 
                              gap: "0.5rem",
                              marginBottom: "0.5rem",
                              padding: "0.5rem",
                              backgroundColor: item.completado ? "#f0f9ff" : "#fef2f2",
                              borderRadius: "4px",
                              border: `1px solid ${item.completado ? "#bae6fd" : "#fecaca"}`
                            }}>
                              <span style={{ 
                                color: item.completado ? "#0369a1" : "#dc2626",
                                fontWeight: "bold",
                                fontSize: "1.1em",
                                marginTop: "0.1rem"
                              }}>
                                {item.completado ? "✓" : "✗"}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  color: item.completado ? "#0369a1" : "#dc2626",
                                  fontWeight: "bold",
                                  textDecoration: item.completado ? "none" : "line-through",
                                  marginBottom: "0.25rem"
                                }}>
                                  {item.elemento}
                                </div>
                                {item.producto && (
                                  <div style={{ 
                                    fontSize: "0.85rem", 
                                    color: "#64748b",
                                    marginBottom: "0.25rem"
                                  }}>
                                    <strong>Producto:</strong> {item.producto}
                                  </div>
                                )}
                                {item.instrucciones && (
                                  <div style={{ 
                                    fontSize: "0.85rem", 
                                    color: "#64748b"
                                  }}>
                                    <strong>Instrucciones:</strong> {item.instrucciones}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {selectedReportType === "control_agua_diario" && (
                  <>
                    <div className="report-detail-item">
                      <strong>Temperatura calentador (&ge;60ºC):</strong>
                      <span>{selectedReport.temperaturaCalentador ?? "-"}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Cloro depósito (0,2-1 PPM):</strong>
                      <span>{selectedReport.cloroDeposito ?? "-"}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>pH depósito (6,5-8,5):</strong>
                      <span>{selectedReport.phDeposito ?? "-"}</span>
                    </div>
                  </>
                )}
                {selectedReportType === "control_agua_semanal" && (
                  <>
                    <div className="report-detail-item">
<strong>Turbidez calentador (&lt;4 UNF):</strong>
                      <span>{selectedReport.turbidezCalentador ?? "-"}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Turbidez depósito (&lt;4 UNF):</strong>
                      <span>{selectedReport.turbidezDeposito ?? "-"}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Purga puntos poco uso (Tº &ge; 50 ºC):</strong>
                      <span>{selectedReport.purgaPuntos ?? "-"}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Turbidez puntos terminales (&lt;4 UNF):</strong>
                      <span>{selectedReport.turbidezPuntos ?? "-"}</span>
                    </div>
                  </>
                )}
                {selectedReportType === "control_agua_mensual" && (
                  <>
                    <div className="report-detail-item">
                      <strong>Suciedad o corrosión:</strong>
                      <span>{selectedReport.suciedadCorrosion ?? "-"}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Tº &lt; 20 ºC (fría):</strong>
                      <span>{selectedReport.tempFria ?? "-"}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Tº &ge; 50 ºC (caliente):</strong>
                      <span>{selectedReport.tempCaliente ?? "-"}</span>
                    </div>
                    <div className="report-detail-item">
                      <strong>Cloro 0,2-1:</strong>
                      <span>{selectedReport.cloroPuntos ?? "-"}</span>
                    </div>
                  </>
                )}
                {selectedReportType === "control_agua_trimestral" && (
                  <div className="report-detail-item">
                    <strong>Suciedad o corrosión:</strong>
                    <span>{selectedReport.suciedadCorrosion ?? "-"}</span>
                  </div>
                )}
                {["control_agua_diario", "control_agua_semanal", "control_agua_mensual", "control_agua_trimestral", "limpieza", "limpieza_planta"].includes(selectedReportType) && (
                  <div className="report-detail-item">
                    <strong>Firma:</strong>
                    <span>
                      {selectedReport.firmaInfo?.sharedLink || selectedReport.firmaInfo?.dropboxPath ? (
                        <a
                          href={selectedReport.firmaInfo?.sharedLink || `https://www.dropbox.com/home${selectedReport.firmaInfo?.dropboxPath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#012b5c", textDecoration: "underline" }}
                        >
                          📎 Ver firma en Dropbox
                        </a>
                      ) : (
                        <span style={{ color: "#64748b" }}>No disponible</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="report-detail-item">
                  <strong>Fecha de creación:</strong>
                  <span>
                    {selectedReport.createdAt
                      ? new Date(selectedReport.createdAt).toLocaleString()
                      : "-"}
                  </span>
                </div>
              </div>
              <div className="report-text-section">
                <h3>Texto completo del informe:</h3>
                <pre className="report-text">{selectedReport.texto}</pre>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="dk-btn dk-btn--primary"
                onClick={() => {
                  setSelectedReport(null);
                  setSelectedReportType(null);
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación de registro */}
      {deletingRecordId && (
        <div className="modal-overlay" onClick={() => setDeletingRecordId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar eliminación</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDeletingRecordId(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="dk-btn dk-btn--ghost"
                onClick={() => setDeletingRecordId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="dk-btn dk-btn--primary"
                style={{ background: "#c62828" }}
                onClick={() => handleDeleteRecord(deletingRecordId)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación de informe */}
      {deletingReportId && deletingReportType && (
        <div className="modal-overlay" onClick={() => {
          setDeletingReportId(null);
          setDeletingReportType(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar eliminación</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setDeletingReportId(null);
                  setDeletingReportType(null);
                }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que quieres eliminar este informe? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="dk-btn dk-btn--ghost"
                onClick={() => {
                  setDeletingReportId(null);
                  setDeletingReportType(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="dk-btn dk-btn--primary"
                style={{ background: "#c62828" }}
                onClick={async () => {
                  try {
                    let endpoint = "";
                    switch (deletingReportType) {
                      case "herramientas":
                        endpoint = "deleteToolReport";
                        break;
                      case "inicial":
                        endpoint = "deleteInitialReport";
                        break;
                      case "envasado":
                        endpoint = "deletePackagingReport";
                        break;
                      case "produccion":
                        endpoint = "deleteProductionReport";
                        break;
                      case "peso":
                        endpoint = "deleteWeightReport";
                        break;
                      case "limpieza":
                        endpoint = "deleteCleaningReport";
                        break;
                      case "limpieza_planta":
                        endpoint = "deleteCleaningPlantReport";
                        break;
                      case "control_residuos":
                        endpoint = "deleteControlResiduesReport";
                        break;
                      case "control_expedicion":
                        endpoint = "deleteControlExpeditionReport";
                        break;
                      case "control_agua_diario":
                        endpoint = "deleteControlAguaDiarioReport";
                        break;
                      case "control_agua_semanal":
                        endpoint = "deleteControlAguaSemanalReport";
                        break;
                      case "control_agua_mensual":
                        endpoint = "deleteControlAguaMensualReport";
                        break;
                      case "control_agua_trimestral":
                        endpoint = "deleteControlAguaTrimestralReport";
                        break;
                      case "satisfaccion":
                        endpoint = "deleteCustomerSatisfactionForm";
                        break;
                      case "testigos":
                        endpoint = "deleteWitnessReport";
                        break;
                      case "libro_visitas":
                        endpoint = "deleteVisitorsBookReport";
                        break;
                      case "recepcion_salida":
                        endpoint = "deleteReceptionExitReport";
                        break;
                    }

                    const response = await fetch(`${apiBase}/${endpoint}?id=${deletingReportId}`, {
                      method: "DELETE",
                    });

                    const data = await response.json();
                    if (!response.ok) {
                      throw new Error(data.message || data.error || "Error al eliminar el informe");
                    }

                    // Actualizar la lista de informes
                    fetchReportsByType(activeTab);
                    setDeletingReportId(null);
                    setDeletingReportType(null);
                    notify("success", "Informe eliminado correctamente.");
                  } catch (error) {
                    notify("error", `Error al eliminar el informe: ${error.message}`);
                    console.error("Error deleting report:", error);
                  }
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición de registro de tiempo */}
      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h2>Editar Registro</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingRecord(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updatedData = {
                    employee_id: formData.get("employee_id"),
                    date: formData.get("date"),
                    check_in: formData.get("check_in") || null,
                    check_out: formData.get("check_out") || null,
                    notes: formData.get("notes") || "",
                  };
                  handleUpdateRecord(editingRecord.id, updatedData);
                }}
              >
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_employee_id" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Empleado:
                  </label>
                  <input
                    type="text"
                    id="edit_employee_id"
                    name="employee_id"
                    defaultValue={editingRecord.employee_id}
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_date" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Fecha:
                  </label>
                  <input
                    type="date"
                    id="edit_date"
                    name="date"
                    defaultValue={editingRecord.date}
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_check_in" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Entrada:
                  </label>
                  <input
                    type="datetime-local"
                    id="edit_check_in"
                    name="check_in"
                    defaultValue={editingRecord.check_in ? new Date(editingRecord.check_in).toISOString().slice(0, 16) : ""}
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_check_out" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Salida:
                  </label>
                  <input
                    type="datetime-local"
                    id="edit_check_out"
                    name="check_out"
                    defaultValue={editingRecord.check_out ? new Date(editingRecord.check_out).toISOString().slice(0, 16) : ""}
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_notes" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Notas:
                  </label>
                  <textarea
                    id="edit_notes"
                    name="notes"
                    defaultValue={editingRecord.notes || ""}
                    rows="3"
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="dk-btn dk-btn--ghost"
                    onClick={() => setEditingRecord(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="dk-btn dk-btn--primary"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición de informe de herramientas */}
      {editingToolReport && (
        <div className="modal-overlay" onClick={() => setEditingToolReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h2>Editar Informe</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingToolReport(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updatedData = {
                    fecha: formData.get("fecha"),
                    hora: formData.get("hora"),
                    tipoRegistro: formData.get("tipoRegistro"),
                    empresaTecnico: formData.get("empresaTecnico") || null,
                    kit: formData.get("kit") || null,
                    checklistEntrada: formData.get("checklistEntrada"),
                    checklistSalida: formData.get("checklistSalida"),
                    carpetaDropbox: formData.get("carpetaDropbox"),
                    carpetaDropboxSeleccionada: formData.get("carpetaDropboxSeleccionada") || null,
                    noConformidad: formData.get("noConformidad"),
                  };
                  handleUpdateToolReport(editingToolReport.id, updatedData);
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_fecha" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Fecha:
                    </label>
                    <input
                      type="date"
                      id="edit_fecha"
                      name="fecha"
                      defaultValue={editingToolReport.fecha}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_hora" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Hora:
                    </label>
                    <input
                      type="time"
                      id="edit_hora"
                      name="hora"
                      defaultValue={editingToolReport.hora}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_tipoRegistro" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Tipo de Registro:
                  </label>
                  <select
                    id="edit_tipoRegistro"
                    name="tipoRegistro"
                    defaultValue={editingToolReport.tipoRegistro}
                    required
                    onChange={(e) => {
                      const newReport = {...editingToolReport, tipoRegistro: e.target.value};
                      setEditingToolReport(newReport);
                    }}
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  >
                    <option value="MANTENIMIENTO_EXTERNO">MANTENIMIENTO EXTERNO</option>
                    <option value="HERRAMIENTAS_ENVASADORAS">HERRAMIENTAS ENVASADORAS (SEMANAL)</option>
                  </select>
                </div>
                {editingToolReport.tipoRegistro === "MANTENIMIENTO_EXTERNO" && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label htmlFor="edit_empresaTecnico" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Empresa/Técnico:
                    </label>
                    <input
                      type="text"
                      id="edit_empresaTecnico"
                      name="empresaTecnico"
                      defaultValue={editingToolReport.empresaTecnico || ""}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                )}
                {editingToolReport.tipoRegistro === "HERRAMIENTAS_ENVASADORAS" && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label htmlFor="edit_kit" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Kit:
                    </label>
                    <input
                      type="text"
                      id="edit_kit"
                      name="kit"
                      defaultValue={editingToolReport.kit || ""}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_checklistEntrada" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Checklist Entrada:
                    </label>
                    <select
                      id="edit_checklistEntrada"
                      name="checklistEntrada"
                      defaultValue={editingToolReport.checklistEntrada}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit_checklistSalida" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Checklist Salida:
                    </label>
                    <select
                      id="edit_checklistSalida"
                      name="checklistSalida"
                      defaultValue={editingToolReport.checklistSalida}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_carpetaDropbox" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Carpeta Dropbox creada:
                  </label>
                  <select
                    id="edit_carpetaDropbox"
                    name="carpetaDropbox"
                    defaultValue={editingToolReport.carpetaDropbox}
                    required
                    onChange={(e) => {
                      const newReport = {...editingToolReport, carpetaDropbox: e.target.value};
                      setEditingToolReport(newReport);
                    }}
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  >
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                {editingToolReport.carpetaDropbox === "SI" && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label htmlFor="edit_carpetaDropboxSeleccionada" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Carpeta Dropbox seleccionada:
                    </label>
                    <select
                      id="edit_carpetaDropboxSeleccionada"
                      name="carpetaDropboxSeleccionada"
                      defaultValue={editingToolReport.carpetaDropboxSeleccionada || ""}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    >
                      <option value="">Seleccione una carpeta</option>
                      <option value="CAJA COMUN">CAJA COMUN</option>
                      <option value="ENVASADORA 2000 ML">ENVASADORA 2000 ML</option>
                      <option value="ENVASADORA 3600">ENVASADORA 3600</option>
                      <option value="ENVASADORA TARRINAS">ENVASADORA TARRINAS</option>
                    </select>
                  </div>
                )}
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_noConformidad" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    No Conformidad:
                  </label>
                  <select
                    id="edit_noConformidad"
                    name="noConformidad"
                    defaultValue={editingToolReport.noConformidad}
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  >
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="dk-btn dk-btn--ghost"
                    onClick={() => setEditingToolReport(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="dk-btn dk-btn--primary"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingControlResiduesReport && (
        <div className="modal-overlay" onClick={() => setEditingControlResiduesReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h2>Editar Control de Residuos</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingControlResiduesReport(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updatedData = {
                    fecha: formData.get("fecha"),
                    hora: formData.get("hora"),
                    paletsCarton: formData.get("paletsCarton"),
                    paletsPlastico: formData.get("paletsPlastico"),
                    paletsFilm: formData.get("paletsFilm"),
                    nombreResponsable: formData.get("nombreResponsable"),
                  };
                  handleUpdateControlResiduesReport(editingControlResiduesReport.id, updatedData);
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_residuos_fecha" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Fecha:
                    </label>
                    <input
                      type="date"
                      id="edit_residuos_fecha"
                      name="fecha"
                      defaultValue={editingControlResiduesReport.fecha}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_residuos_hora" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Hora:
                    </label>
                    <input
                      type="time"
                      id="edit_residuos_hora"
                      name="hora"
                      defaultValue={editingControlResiduesReport.hora}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_residuos_carton" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Palets cartón:
                    </label>
                    <input
                      type="number"
                      id="edit_residuos_carton"
                      name="paletsCarton"
                      defaultValue={editingControlResiduesReport.paletsCarton}
                      min="0"
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_residuos_plastico" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Palets plástico:
                    </label>
                    <input
                      type="number"
                      id="edit_residuos_plastico"
                      name="paletsPlastico"
                      defaultValue={editingControlResiduesReport.paletsPlastico}
                      min="0"
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_residuos_film" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Palets film:
                    </label>
                    <input
                      type="number"
                      id="edit_residuos_film"
                      name="paletsFilm"
                      defaultValue={editingControlResiduesReport.paletsFilm}
                      min="0"
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_residuos_responsable" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Nombre responsable:
                  </label>
                  <input
                    type="text"
                    id="edit_residuos_responsable"
                    name="nombreResponsable"
                    defaultValue={editingControlResiduesReport.nombreResponsable}
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="dk-btn dk-btn--ghost"
                    onClick={() => setEditingControlResiduesReport(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="dk-btn dk-btn--primary"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingCleaningPlantReport && (
        <div className="modal-overlay" onClick={() => setEditingCleaningPlantReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h2>Editar Limpieza Planta</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingCleaningPlantReport(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updatedData = {
                    fecha: formData.get("fecha"),
                    hora: formData.get("hora"),
                    periodo: formData.get("periodo"),
                    limpiezaCompletada: formData.get("limpiezaCompletada") === "SI",
                  };
                  handleUpdateCleaningPlantReport(editingCleaningPlantReport.id, updatedData);
                }}
              >
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Zona</label>
                  <div style={{ padding: "0.75rem", backgroundColor: "#f1f5f9", borderRadius: "8px" }}>
                    {editingCleaningPlantReport.zonaNombre || editingCleaningPlantReport.zona}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_limpieza_planta_fecha" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Fecha</label>
                    <input
                      type="date"
                      id="edit_limpieza_planta_fecha"
                      name="fecha"
                      defaultValue={editingCleaningPlantReport.fecha}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_limpieza_planta_hora" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Hora</label>
                    <input
                      type="time"
                      id="edit_limpieza_planta_hora"
                      name="hora"
                      defaultValue={editingCleaningPlantReport.hora}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_limpieza_planta_periodo" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Periodo</label>
                  <select
                    id="edit_limpieza_planta_periodo"
                    name="periodo"
                    defaultValue={editingCleaningPlantReport.periodo || "SEMANAL"}
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  >
                    <option value="SEMANAL">Semanal</option>
                    <option value="MENSUAL">Mensual</option>
                    <option value="TRIMESTRAL">Trimestral</option>
                    <option value="ANUAL">Anual</option>
                  </select>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_limpieza_planta_completada" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Limpieza completada</label>
                  <select
                    id="edit_limpieza_planta_completada"
                    name="limpiezaCompletada"
                    defaultValue={editingCleaningPlantReport.limpiezaCompletada ? "SI" : "NO"}
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  >
                    <option value="SI">Sí</option>
                    <option value="NO">No</option>
                  </select>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="dk-btn dk-btn--ghost"
                    onClick={() => setEditingCleaningPlantReport(null)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="dk-btn dk-btn--primary">
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingControlExpeditionReport && (
        <div className="modal-overlay" onClick={() => setEditingControlExpeditionReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h2>Editar Control de Expedición</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingControlExpeditionReport(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updatedData = {
                    fecha: formData.get("fecha"),
                    hora: formData.get("hora"),
                    producto: formData.get("producto"),
                    lote: formData.get("lote"),
                    numeroPalet: formData.get("numeroPalet"),
                    paletIntegro: formData.get("paletIntegro"),
                    flejadoOK: formData.get("flejadoOK"),
                    etiquetaCorrecta: formData.get("etiquetaCorrecta"),
                    conteoCorrecto: formData.get("conteoCorrecto"),
                    responsable: formData.get("responsable"),
                  };
                  handleUpdateControlExpeditionReport(editingControlExpeditionReport.id, updatedData);
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_expedicion_fecha" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Fecha:
                    </label>
                    <input
                      type="date"
                      id="edit_expedicion_fecha"
                      name="fecha"
                      defaultValue={editingControlExpeditionReport.fecha}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_expedicion_hora" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Hora:
                    </label>
                    <input
                      type="time"
                      id="edit_expedicion_hora"
                      name="hora"
                      defaultValue={editingControlExpeditionReport.hora}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_expedicion_producto" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Producto:
                  </label>
                  <input
                    type="text"
                    id="edit_expedicion_producto"
                    name="producto"
                    defaultValue={editingControlExpeditionReport.producto}
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_expedicion_lote" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Lote:
                    </label>
                    <input
                      type="text"
                      id="edit_expedicion_lote"
                      name="lote"
                      defaultValue={editingControlExpeditionReport.lote}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_expedicion_numeroPalet" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Número palet:
                    </label>
                    <input
                      type="number"
                      id="edit_expedicion_numeroPalet"
                      name="numeroPalet"
                      defaultValue={editingControlExpeditionReport.numeroPalet}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_expedicion_paletIntegro" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Palet íntegro:
                    </label>
                    <select
                      id="edit_expedicion_paletIntegro"
                      name="paletIntegro"
                      defaultValue={editingControlExpeditionReport.paletIntegro}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit_expedicion_flejado" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Flejado OK:
                    </label>
                    <select
                      id="edit_expedicion_flejado"
                      name="flejadoOK"
                      defaultValue={editingControlExpeditionReport.flejadoOK}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_expedicion_etiqueta" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Etiqueta correcta:
                    </label>
                    <select
                      id="edit_expedicion_etiqueta"
                      name="etiquetaCorrecta"
                      defaultValue={editingControlExpeditionReport.etiquetaCorrecta}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit_expedicion_conteo" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Conteo correcto:
                    </label>
                    <select
                      id="edit_expedicion_conteo"
                      name="conteoCorrecto"
                      defaultValue={editingControlExpeditionReport.conteoCorrecto}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_expedicion_responsable" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Responsable:
                  </label>
                  <input
                    type="text"
                    id="edit_expedicion_responsable"
                    name="responsable"
                    defaultValue={editingControlExpeditionReport.responsable}
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="dk-btn dk-btn--ghost"
                    onClick={() => setEditingControlExpeditionReport(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="dk-btn dk-btn--primary"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingControlAguaDiarioReport && (
        <div className="modal-overlay" onClick={() => setEditingControlAguaDiarioReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h2>Editar Control Agua Diario</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingControlAguaDiarioReport(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updatedData = {
                    fecha: formData.get("fecha"),
                    hora: formData.get("hora"),
                    temperaturaCalentador: formData.get("temperaturaCalentador"),
                    cloroDeposito: formData.get("cloroDeposito"),
                    phDeposito: formData.get("phDeposito"),
                  };
                  handleUpdateControlAguaDiarioReport(editingControlAguaDiarioReport.id, updatedData);
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_agua_diario_fecha" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Fecha:
                    </label>
                    <input
                      type="date"
                      id="edit_agua_diario_fecha"
                      name="fecha"
                      defaultValue={editingControlAguaDiarioReport.fecha}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_agua_diario_hora" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Hora:
                    </label>
                    <input
                      type="time"
                      id="edit_agua_diario_hora"
                      name="hora"
                      defaultValue={editingControlAguaDiarioReport.hora}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_agua_diario_temp" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Temperatura calentador (&ge;60ºC):
                    </label>
                    <input
                      type="text"
                      id="edit_agua_diario_temp"
                      name="temperaturaCalentador"
                      defaultValue={editingControlAguaDiarioReport.temperaturaCalentador}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_agua_diario_cloro" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Cloro depósito (0,2-1 PPM):
                    </label>
                    <input
                      type="text"
                      id="edit_agua_diario_cloro"
                      name="cloroDeposito"
                      defaultValue={editingControlAguaDiarioReport.cloroDeposito}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_agua_diario_ph" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    pH depósito (6,5-8,5):
                  </label>
                  <input
                    type="text"
                    id="edit_agua_diario_ph"
                    name="phDeposito"
                    defaultValue={editingControlAguaDiarioReport.phDeposito}
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="dk-btn dk-btn--ghost" onClick={() => setEditingControlAguaDiarioReport(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="dk-btn dk-btn--primary">
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingControlAguaSemanalReport && (
        <div className="modal-overlay" onClick={() => setEditingControlAguaSemanalReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "650px" }}>
            <div className="modal-header">
              <h2>Editar Control Agua Semanal</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingControlAguaSemanalReport(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updatedData = {
                    fecha: formData.get("fecha"),
                    hora: formData.get("hora"),
                    turbidezCalentador: formData.get("turbidezCalentador"),
                    turbidezDeposito: formData.get("turbidezDeposito"),
                    purgaPuntos: formData.get("purgaPuntos"),
                    turbidezPuntos: formData.get("turbidezPuntos"),
                  };
                  handleUpdateControlAguaSemanalReport(editingControlAguaSemanalReport.id, updatedData);
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_agua_semanal_fecha" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Fecha:
                    </label>
                    <input
                      type="date"
                      id="edit_agua_semanal_fecha"
                      name="fecha"
                      defaultValue={editingControlAguaSemanalReport.fecha}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_agua_semanal_hora" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Hora:
                    </label>
                    <input
                      type="time"
                      id="edit_agua_semanal_hora"
                      name="hora"
                      defaultValue={editingControlAguaSemanalReport.hora}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_agua_semanal_turbidez_cal" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Turbidez calentador (&lt;4 UNF):
                    </label>
                    <input
                      type="text"
                      id="edit_agua_semanal_turbidez_cal"
                      name="turbidezCalentador"
                      defaultValue={editingControlAguaSemanalReport.turbidezCalentador}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_agua_semanal_turbidez_dep" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Turbidez depósito (&lt;4 UNF):
                    </label>
                    <input
                      type="text"
                      id="edit_agua_semanal_turbidez_dep"
                      name="turbidezDeposito"
                      defaultValue={editingControlAguaSemanalReport.turbidezDeposito}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_agua_semanal_purga" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Purga puntos poco uso (Tº &ge; 50 ºC):
                    </label>
                    <input
                      type="text"
                      id="edit_agua_semanal_purga"
                      name="purgaPuntos"
                      defaultValue={editingControlAguaSemanalReport.purgaPuntos}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_agua_semanal_turbidez_puntos" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Turbidez puntos terminales (&lt;4 UNF):
                    </label>
                    <input
                      type="text"
                      id="edit_agua_semanal_turbidez_puntos"
                      name="turbidezPuntos"
                      defaultValue={editingControlAguaSemanalReport.turbidezPuntos}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="dk-btn dk-btn--ghost" onClick={() => setEditingControlAguaSemanalReport(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="dk-btn dk-btn--primary">
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingControlAguaMensualReport && (
        <div className="modal-overlay" onClick={() => setEditingControlAguaMensualReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "650px" }}>
            <div className="modal-header">
              <h2>Editar Control Agua Mensual</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingControlAguaMensualReport(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const updatedData = {
                    fecha: formData.get("fecha"),
                    hora: formData.get("hora"),
                    suciedadCorrosion: formData.get("suciedadCorrosion"),
                    tempFria: formData.get("tempFria"),
                    tempCaliente: formData.get("tempCaliente"),
                    cloroPuntos: formData.get("cloroPuntos"),
                  };
                  handleUpdateControlAguaMensualReport(editingControlAguaMensualReport.id, updatedData);
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_agua_mensual_fecha" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Fecha:
                    </label>
                    <input
                      type="date"
                      id="edit_agua_mensual_fecha"
                      name="fecha"
                      defaultValue={editingControlAguaMensualReport.fecha}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_agua_mensual_hora" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Hora:
                    </label>
                    <input
                      type="time"
                      id="edit_agua_mensual_hora"
                      name="hora"
                      defaultValue={editingControlAguaMensualReport.hora}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_agua_mensual_suciedad" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Suciedad o corrosión?
                  </label>
                  <select
                    id="edit_agua_mensual_suciedad"
                    name="suciedadCorrosion"
                    defaultValue={editingControlAguaMensualReport.suciedadCorrosion}
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  >
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="edit_agua_mensual_frio" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Tº &lt; 20 ºC (fría):
                    </label>
                    <input
                      type="text"
                      id="edit_agua_mensual_frio"
                      name="tempFria"
                      defaultValue={editingControlAguaMensualReport.tempFria}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit_agua_mensual_caliente" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Tº &ge; 50 ºC (caliente):
                    </label>
                    <input
                      type="text"
                      id="edit_agua_mensual_caliente"
                      name="tempCaliente"
                      defaultValue={editingControlAguaMensualReport.tempCaliente}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="edit_agua_mensual_cloro" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Cloro 0,2-1:
                  </label>
                  <input
                    type="text"
                    id="edit_agua_mensual_cloro"
                    name="cloroPuntos"
                    defaultValue={editingControlAguaMensualReport.cloroPuntos}
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="dk-btn dk-btn--ghost" onClick={() => setEditingControlAguaMensualReport(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="dk-btn dk-btn--primary">
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {editingSatisfactionForm && (
        <div className="modal-overlay" onClick={() => setEditingSatisfactionForm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "820px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h2>Editar encuesta de satisfacción</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingSatisfactionForm(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const scoreKeys = [
                    "a1","a2","a3","a4","a5",
                    "b1","b2","b3","b4",
                    "c1","c2","c3",
                    "d1","d2",
                  ];
                  const scores = {};
                  scoreKeys.forEach((key) => {
                    const value = formData.get(key);
                    if (value) scores[key] = value;
                  });
                  const updatedData = {
                    cliente: formData.get("cliente"),
                    contacto: formData.get("contacto"),
                    email: formData.get("email"),
                    telefono: formData.get("telefono"),
                    canal: formData.get("canal"),
                    fecha: formData.get("fecha"),
                    valoras: formData.get("valoras"),
                    mejoras: formData.get("mejoras"),
                    comentarios: formData.get("comentarios"),
                    scores,
                  };
                  handleUpdateCustomerSatisfactionForm(editingSatisfactionForm.id, updatedData);
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="satisf_cliente" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Cliente</label>
                    <input
                      id="satisf_cliente"
                      name="cliente"
                      defaultValue={editingSatisfactionForm.cliente}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="satisf_contacto" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Contacto</label>
                    <input
                      id="satisf_contacto"
                      name="contacto"
                      defaultValue={editingSatisfactionForm.contacto}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="satisf_email" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Email</label>
                    <input
                      id="satisf_email"
                      name="email"
                      defaultValue={editingSatisfactionForm.email}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="satisf_telefono" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Teléfono</label>
                    <input
                      id="satisf_telefono"
                      name="telefono"
                      defaultValue={editingSatisfactionForm.telefono}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="satisf_canal" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Canal</label>
                    <select
                      id="satisf_canal"
                      name="canal"
                      defaultValue={editingSatisfactionForm.canal}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    >
                      <option value="HORECA">HORECA</option>
                      <option value="RETAIL">Retail</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="satisf_fecha" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Fecha</label>
                    <input
                      type="date"
                      id="satisf_fecha"
                      name="fecha"
                      defaultValue={editingSatisfactionForm.fecha}
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Puntuaciones (1-5)</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
                    {[
                      "a1","a2","a3","a4","a5",
                      "b1","b2","b3","b4",
                      "c1","c2","c3",
                      "d1","d2",
                    ].map((key) => (
                      <div key={key}>
                        <label style={{ fontSize: "0.85rem" }}>{key.toUpperCase()}</label>
                        <select
                          name={key}
                          defaultValue={(editingSatisfactionForm.scores && editingSatisfactionForm.scores[key]) || ""}
                          style={{ width: "100%", padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                        >
                          <option value="">-</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label htmlFor="satisf_valoras" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Lo que más valoras</label>
                    <textarea
                      id="satisf_valoras"
                      name="valoras"
                      defaultValue={editingSatisfactionForm.valoras}
                      rows="3"
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="satisf_mejoras" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Aspectos a mejorar</label>
                    <textarea
                      id="satisf_mejoras"
                      name="mejoras"
                      defaultValue={editingSatisfactionForm.mejoras}
                      rows="3"
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="satisf_comentarios" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Otros comentarios</label>
                  <textarea
                    id="satisf_comentarios"
                    name="comentarios"
                    defaultValue={editingSatisfactionForm.comentarios}
                    rows="3"
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="dk-btn dk-btn--ghost"
                    onClick={() => setEditingSatisfactionForm(null)}
                >
                    Cancelar
                  <input
                    type="text"
                    id="weekly_semana"
                    value={weeklyExportForm.semana}
                    onChange={(e) => setWeeklyExportForm((prev) => ({ ...prev, semana: e.target.value }))}
                    placeholder="Ej: 09/02/2026 – 13/02/2026"
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  /></button>

                 
                </div>
                <div style={{ marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label htmlFor="weekly_lote" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Lote
                    </label>
                    <input
                      type="text"
                      id="weekly_lote"
                      value={weeklyExportForm.lote}
                      onChange={(e) => setWeeklyExportForm((prev) => ({ ...prev, lote: e.target.value }))}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="weekly_caducidad" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                      Fecha caducidad
                    </label>
                    <input
                      type="date"
                      id="weekly_caducidad"
                      value={weeklyExportForm.fechaCaducidad}
                      onChange={(e) => setWeeklyExportForm((prev) => ({ ...prev, fechaCaducidad: e.target.value }))}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="weekly_responsable" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Responsable revisión
                  </label>
                  <input
                    type="text"
                    id="weekly_responsable"
                    value={weeklyExportForm.responsable}
                    onChange={(e) => setWeeklyExportForm((prev) => ({ ...prev, responsable: e.target.value }))}
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="dk-btn dk-btn--ghost"
                    onClick={() => setShowWeeklyExportModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="dk-btn dk-btn--primary">
                    Exportar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

                    
      )}  
      {renderNotifications()}
    </div>

  );
}

export default App;
