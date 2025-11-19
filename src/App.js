import { useEffect, useState } from "react";
import "./App.css";
import BrandLogo from "./components/BrandLogo";
import Login from "./components/Login";
import { useAuth } from "./context/AuthContext";
import * as XLSX from "xlsx";

function App() {
  const { user, role, logout, apiBase } = useAuth();
  const [workerLoading, setWorkerLoading] = useState(null);
  const [workerMessage, setWorkerMessage] = useState(null);
  const [adminRecords, setAdminRecords] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [stats, setStats] = useState({
    activeEmployees: 0,
    hoursToday: 0,
    pending: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const pendingRecords = adminRecords.filter(
      (record) => record.check_in && !record.check_out,
  );

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
          setStats(data);
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
    return () => {
      isMounted = false;
    };
  }, [role, apiBase]);
  if (!user) {
    return (
      <div className="auth-screen">
        <Login />
      </div>
    );
  }

  const exportToExcel = () => {
    if (adminRecords.length === 0) {
      alert("No hay registros para exportar");
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
      Notas: record.notes || "-",
    }));

    // Crear el libro de trabajo
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");

    // Generar el nombre del archivo con la fecha actual
    const fecha = new Date().toISOString().split("T")[0];
    const fileName = `historial_trabajadores_${fecha}.xlsx`;

    // Descargar el archivo
    XLSX.writeFile(workbook, fileName);
  };

  const handleWorkerAction = async (action) => {
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
              disabled={workerLoading === "in"}
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
      </div>
    );
  }

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
            <p>Pendientes por aprobar</p>
            <strong>{statsLoading ? "..." : stats.pending}</strong>
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
            <div className="records-table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRecords.length === 0 ? (
                    <tr>
                      <td colSpan="4">No hay registros pendientes.</td>
                    </tr>
                  ) : (
                    pendingRecords.map((record) => (
                      <tr key={`${record.id}-pending`}>
                        <td>{record.employee_id}</td>
                        <td>{record.date}</td>
                        <td>
                          {record.check_in
                            ? new Date(record.check_in).toLocaleTimeString()
                            : "-"}
                        </td>
                        <td>{record.notes || "-"}</td>
                      </tr>
                    ))
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
            <div className="records-table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Horas</th>
                    <th>Estado</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRecords.length === 0 ? (
                    <tr>
                      <td colSpan="7">No hay registros recientes.</td>
                    </tr>
                  ) : (
                    adminRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{record.employee_id}</td>
                        <td>{record.date}</td>
                        <td>{record.check_in ? new Date(record.check_in).toLocaleTimeString() : "-"}</td>
                        <td>{record.check_out ? new Date(record.check_out).toLocaleTimeString() : "-"}</td>
                        <td>{record.worked_hours ?? "-"}</td>
                        <td>{record.status}</td>
                        <td>{record.notes || "-"}</td>
                      </tr>
                    ))
                  )}
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
    </div>
  );
}

export default App;
