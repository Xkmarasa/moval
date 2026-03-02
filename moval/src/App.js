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
import { AdminPanel } from "./admin";

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
        title: options.title || "Confirmar acciÃ³n",
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
      warning: "AtenciÃ³n",
      info: "InformaciÃ³n",
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
              Ã—
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
    
    // Cargar automÃ¡ticamente los datos de limpieza planta
    fetchReportsByType("limpieza_planta");
    
    return () => {
      isMounted = false;
    };
  }, [role, apiBase]);

  // Resetear lÃ­mites cuando cambian los registros
  useEffect(() => {
    if (role === "admin") {
      setPendingRecordsLimit(10);
      setHistoryRecordsLimit(10);
    }
  }, [adminRecords.length, role]);

  // FunciÃ³n para eliminar un registro de tiempo
  const handleDeleteRecord = async (recordId) => {
    const confirmed = await confirmAction({
      title: "Eliminar registro",
      message: "Â¿EstÃ¡s seguro de que quieres eliminar este registro? Esta acciÃ³n no se puede deshacer.",
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

  // FunciÃ³n para actualizar un registro de tiempo
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

  // FunciÃ³n para eliminar un informe de herramientas
  const handleDeleteToolReport = async (reportId) => {
    const confirmed = await confirmAction({
      title: "Eliminar informe",
      message: "Â¿EstÃ¡s seguro de que quieres eliminar este informe? Esta acciÃ³n no se puede deshacer.",
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

  // FunciÃ³n para actualizar un informe de herramientas
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

  // FunciÃ³n para actualizar un informe de control de residuos
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

  // FunciÃ³n para cargar informes por tipo
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

  // FunciÃ³n para cargar todos los borradores pendientes (admin)
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
          area: "PCC2 â€“ pH",
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
    const headerSemana = weeklyExportForm.semana || `${formatDate(start)} â€“ ${formatDate(end)}`;
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
      ["DASHBOARD SEMANAL CONTROL PRODUCCIÃ“N", "", "", "", "LOTE", lote],
      ["Semana", headerSemana, "", "", "FEC. CAD.", fechaCaducidad],
      ["Responsable revisiÃ³n", responsable, "", "", "", ""],
      [""],
      ["ÃREA CONTROLADA", "Registros real", "Desviaciones de", "Estado"],
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

  // FunciÃ³n para renderizar la tabla de informes segÃºn el tipo activo
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

    // FunciÃ³n para exportar a Excel
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
            "NÃºmero campaÃ±a": report.numeroCampana ?? report.datosCompletos?.numeroCampana ?? "",
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
          LimpiezaCompletada: report.limpiezaCompletada ? "SÃ­" : "No",
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
          "Temperatura Calentador (&ge;60ÂºC)": report.temperaturaCalentador ?? "",
          "Cloro DepÃ³sito (0,2-1 PPM)": report.cloroDeposito ?? "",
          "pH DepÃ³sito (6,5-8,5)": report.phDeposito ?? "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "control_agua_semanal") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          "Turbidez Calentador (<4 UNF)": report.turbidezCalentador ?? "",
          "Turbidez DepÃ³sito (<4 UNF)": report.turbidezDeposito ?? "",
          "Purga Puntos Poco Uso (TÂº &ge; 50 ÂºC)": report.purgaPuntos ?? "",
          "Turbidez Puntos Terminales (<4 UNF)": report.turbidezPuntos ?? "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "control_agua_mensual") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          "Suciedad o CorrosiÃ³n": report.suciedadCorrosion ?? "",
          "TÂº < 20 ÂºC (frÃ­a)": report.tempFria ?? "",
          "TÂº &ge; 50 ÂºC (caliente)": report.tempCaliente ?? "",
          "Cloro 0,2-1": report.cloroPuntos ?? "",
          FirmaDropbox: report.firmaInfo?.sharedLink || "",
        }));
      } else if (reportType === "control_agua_trimestral") {
        dataForExcel = reports.map((report) => ({
          Empleado: getEmployeeName(report),
          Fecha: report.fecha,
          Hora: report.hora,
          "Suciedad o CorrosiÃ³n": report.suciedadCorrosion ?? "",
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
            ðŸ“Š Exportar a Excel
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
                {activeTab === "recepcion_salida" && <th>NÂº AlbarÃ¡n</th>}
                {activeTab === "control_residuos" && <th>Palets CartÃ³n</th>}
                {activeTab === "control_expedicion" && <th>Producto</th>}
                {activeTab === "control_agua_diario" && <th>Temp. Calentador</th>}
                {activeTab === "control_agua_semanal" && <th>Turbidez Calentador</th>}
                {activeTab === "control_agua_mensual" && <th>Suciedad/CorrosiÃ³n</th>}
                {activeTab === "control_agua_trimestral" && <th>Suciedad/CorrosiÃ³n</th>}
                {activeTab === "satisfaccion" && <th>Cliente</th>}
                {activeTab === "satisfaccion" && <th>ISG</th>}
                <th style={{ minWidth: "160px" }}>Acciones</th>
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
                        ðŸ‘ï¸ Ver
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
                        âœï¸ Editar
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
                        ðŸ—‘ï¸ Eliminar
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

  // Vista especÃ­fica para el usuario de informes
  if (user && role === "informes") {
    return (
      <div className="app-shell">
        <header className="hero">
          <div className="hero__brand">
            <BrandLogo />
            <div>
              <p className="eyebrow">Plataforma interna</p>
              <h1>
                MÃ³dulo de <span>Informes</span>
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
              <h2>MenÃº de informes</h2>
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
                ðŸ”§ Control de herramientas
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
                ðŸ“‹ Inicial
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
                ðŸ“¦ Envasado
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
                ðŸ­ ProducciÃ³n
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
                âš–ï¸ Peso producto
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
                ðŸ§¹ Limpieza
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
                ðŸ­ Limpieza Planta
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
                ðŸ“– Libro de visitas
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
                ðŸšš RecepciÃ³n / salida mercancÃ­a
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
                â™»ï¸ Control de residuos
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
                ðŸ§² Registro de Testigos
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
                ðŸ“¦ Control de expediciÃ³n
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
                ðŸ’§ Control agua
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
                  El informe <strong>{selectedInforme.replace("_", " ")}</strong> se mostrarÃ¡ aquÃ­ cuando estÃ© implementado.
                </p>
              )}
          </section>
        </main>

        <footer className="app-footer">
          <BrandLogo />
          <p>Â© {new Date().getFullYear()} DK Tegoria Â· MÃ³dulo de informes</p>
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
                  Ã—
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
            ? "No se encontrÃ³ una entrada pendiente. AsegÃºrate de registrar la entrada primero."
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
      
      // Actualizar el estado de entrada pendiente despuÃ©s de la acciÃ³n
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

  // Renderizar AdminPanel para el rol de admin (código movido a componente separado)
  return <AdminPanel />;
}

export default App;
