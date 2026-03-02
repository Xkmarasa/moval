import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import * as XLSX from 'xlsx';
import { LIMPIEZA_PLANTA_ZONAS } from '../data/limpiezaPlantaZonas';

// Importar hooks
import { useAdminRecords } from '../hooks/useAdminRecords';
import { useReports } from '../hooks/useReports';
import { useWeeklySummary } from '../hooks/useWeeklySummary';

// Importar componentes
import WorkerHistory from './WorkerHistory';
import PendingRecords from './PendingRecords';
import WeeklySummary from './WeeklySummary';
import ReportsManagement from './ReportsManagement';

const AdminPanel = ({ onLogout }) => {
  const { user, role, logout, apiBase } = useAuth();
  const [activeTab, setActiveTab] = useState('herramientas');
  const [limpiezaPlantaZonaFilter, setLimpiezaPlantaZonaFilter] = useState('TODAS');
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [deletingRecordId, setDeletingRecordId] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [deletingReportType, setDeletingReportType] = useState(null);
  const toastTimerRef = useRef(null);

  // Usar hooks personalizados
  const {
    adminRecords,
    adminLoading,
    adminError,
    stats,
    totalWorkedHours,
    statsLoading,
    pendingRecords,
    deleteRecord,
    updateRecord,
    fetchRecords
  } = useAdminRecords(role, apiBase);

  const {
    toolReports,
    initialReports,
    packagingReports,
    productionReports,
    weightReports,
    cleaningReports,
    cleaningPlantReports,
    visitorsBookReports,
    witnessReports,
    receptionExitReports,
    controlResiduesReports,
    controlExpeditionReports,
    controlAguaDiarioReports,
    controlAguaSemanalReports,
    controlAguaMensualReports,
    controlAguaTrimestralReports,
    satisfactionForms,
    reportsLoading,
    reportsError,
    fetchReportsByType,
    deleteReport
  } = useReports(role, apiBase);

  const {
    weeklySummaryRows,
    weeklySummaryMeta,
    weeklySummaryLoading,
    weeklySummaryError,
    fetchWeeklySummary,
    formatDate
  } = useWeeklySummary(role, apiBase);

  // Cargar informes de limpieza planta al inicio y cuando sea necesario
  useEffect(() => {
    if (role === 'admin') {
      fetchReportsByType('limpieza_planta');
    }
  }, [role, fetchReportsByType]);

  const notify = (type, text) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ type, text });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const confirmAction = useCallback((options) =>
    new Promise((resolve) => {
      setConfirmDialog({
        title: options.title || 'Confirmar acción',
        message: options.message,
        confirmLabel: options.confirmLabel || 'Confirmar',
        cancelLabel: options.cancelLabel || 'Cancelar',
        tone: options.tone || 'warning',
        onConfirm: () => {
          resolve(true);
          setConfirmDialog(null);
        },
        onCancel: () => {
          resolve(false);
          setConfirmDialog(null);
        },
      });
    }), []);

  const handleDeleteRecord = async (recordId) => {
    const confirmed = await confirmAction({
      title: 'Eliminar registro',
      message: '¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;

    const result = await deleteRecord(recordId);
    if (result.success) {
      notify('success', 'Registro eliminado correctamente.');
    } else {
      notify('error', `Error al eliminar el registro: ${result.error}`);
    }
  };

  const handleUpdateRecord = async (recordId, updatedData) => {
    const result = await updateRecord(recordId, updatedData);
    if (result.success) {
      setEditingRecord(null);
      notify('success', 'Registro actualizado correctamente.');
    } else {
      notify('error', `Error al actualizar el registro: ${result.error}`);
    }
  };

  const handleDeleteReport = async (reportId) => {
    const confirmed = await confirmAction({
      title: 'Eliminar informe',
      message: '¿Estás seguro de que quieres eliminar este informe? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;

    const result = await deleteReport(activeTab, reportId);
    if (result.success) {
      fetchReportsByType(activeTab);
      notify('success', 'Informe eliminado correctamente.');
    } else {
      notify('error', `Error al eliminar el informe: ${result.error}`);
    }
  };

  const applyRowStyle = (worksheet, rowIndex, style) => {
    if (!worksheet || !worksheet['!ref']) return;
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ c: C, r: rowIndex });
      const cell = worksheet[address];
      if (!cell) continue;
      cell.s = style;
    }
  };

  const renderNotifications = () => {
    const titleMap = {
      success: 'Correcto',
      error: 'Error',
      warning: 'Atención',
      info: 'Información',
    };
    return (
      <>
        {toast && (
          <div className={`app-toast app-toast--${toast.type || 'info'}`}>
            <div className="app-toast__content">
              <p className="app-toast__title">{titleMap[toast.type] || 'Aviso'}</p>
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
            <div className={`app-dialog app-dialog--${confirmDialog.tone || 'warning'}`}>
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
                  {confirmDialog.cancelLabel || 'Cancelar'}
                </button>
                <button
                  type="button"
                  className="dk-btn dk-btn--primary app-dialog__confirm"
                  onClick={confirmDialog.onConfirm}
                >
                  {confirmDialog.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Limpieza planta section
  const getEmployeeName = (report) => {
    return (
      (report && (report.firmaNombreEmpleado || (report.datosCompletos && report.datosCompletos.firmaNombreEmpleado))) ||
      report?.employeeName || report?.employee || report?.employee_id || ''
    );
  };

  const exportLimpiezaPlantaExcel = () => {
    const reportsToExport = limpiezaPlantaZonaFilter === 'TODAS' 
      ? cleaningPlantReports 
      : cleaningPlantReports.filter(r => (r.zonaNombre || r.zona) === limpiezaPlantaZonaFilter || LIMPIEZA_PLANTA_ZONAS.find(z => z.id === limpiezaPlantaZonaFilter)?.nombre === (r.zonaNombre || r.zona));
    
    if (reportsToExport.length === 0) {
      notify('warning', 'No hay informes para exportar.');
      return;
    }
    
    const dataForExcel = reportsToExport.map((report) => ({
      Empleado: getEmployeeName(report),
      Fecha: report.fecha,
      Hora: report.hora,
      Zona: (report.zonaNombre || report.zona) ?? '',
      Periodo: report.periodo || 'SEMANAL',
      LimpiezaCompletada: report.limpiezaCompletada ? 'Sí' : 'No',
      FirmaDropbox: report.firmaInfo?.sharedLink || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const applyHeaderStyle = (worksheet) => {
      if (!worksheet || !worksheet['!ref']) return;
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ c: C, r: 0 });
        const cell = worksheet[address];
        if (!cell) continue;
        cell.s = {
          fill: { patternType: 'solid', fgColor: { rgb: '012B5C' } },
          font: { color: { rgb: 'FFFFFF' }, bold: true },
        };
      }
    };
    applyHeaderStyle(ws);
    const wb = XLSX.utils.book_new();
    const zonaNombre = limpiezaPlantaZonaFilter === 'TODAS' 
      ? 'todas_las_zonas' 
      : LIMPIEZA_PLANTA_ZONAS.find(z => z.id === limpiezaPlantaZonaFilter)?.nombre || limpiezaPlantaZonaFilter;
    XLSX.utils.book_append_sheet(wb, ws, 'Limpieza Planta');
    XLSX.writeFile(wb, `informe_limpieza_${zonaNombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
    notify('success', `Exportado: ${reportsToExport.length} registro(s)`);
  };

  const filteredCleaningPlantReports = limpiezaPlantaZonaFilter === 'TODAS' 
    ? cleaningPlantReports 
    : cleaningPlantReports.filter(r => (r.zonaNombre || r.zona) === limpiezaPlantaZonaFilter || LIMPIEZA_PLANTA_ZONAS.find(z => z.id === limpiezaPlantaZonaFilter)?.nombre === (r.zonaNombre || r.zona));

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__brand">
          <BrandLogo />
          <div>
            <p className="eyebrow">Plataforma interna</p>
            <h1>Registro de horas <span>DK Tegoria</span></h1>
            <p>Controla entradas y salidas desde un panel claro, pensado para tus supervisores y equipo administrativo.</p>
          </div>
          <div className="hero__session">
            <span>{user.nombre || user.usuario}</span>
            <button type="button" className="dk-btn dk-btn--logout" onClick={logout}>Salir</button>
          </div>
        </div>

        <div className="hero__summary">
          <article className="summary-card summary-card--primary">
            <p>Colaboradores activos</p>
            <strong>{statsLoading ? '...' : stats.activeEmployees}</strong>
          </article>
          <article className="summary-card summary-card--accent">
            <p>Horas registradas hoy</p>
            <strong>{statsLoading ? '...' : `${stats.hoursToday}h`}</strong>
          </article>
          <article className="summary-card summary-card--warning">
            <p>Horas acumuladas</p>
            <strong>{adminLoading ? '...' : `${totalWorkedHours}h`}</strong>
          </article>
        </div>
      </header>

      <main className="dashboard">
        <WorkerHistory 
          adminRecords={adminRecords}
          adminLoading={adminLoading}
          adminError={adminError}
          totalWorkedHours={totalWorkedHours}
          onDeleteRecord={handleDeleteRecord}
          onUpdateRecord={handleUpdateRecord}
          setEditingRecord={setEditingRecord}
        />

        <ReportsManagement
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          reportsLoading={reportsLoading}
          reportsError={reportsError}
          toolReports={toolReports}
          initialReports={initialReports}
          packagingReports={packagingReports}
          productionReports={productionReports}
          weightReports={weightReports}
          cleaningReports={cleaningReports}
          cleaningPlantReports={cleaningPlantReports}
          visitorsBookReports={visitorsBookReports}
          witnessReports={witnessReports}
          receptionExitReports={receptionExitReports}
          controlResiduesReports={controlResiduesReports}
          controlExpeditionReports={controlExpeditionReports}
          controlAguaDiarioReports={controlAguaDiarioReports}
          controlAguaSemanalReports={controlAguaSemanalReports}
          controlAguaMensualReports={controlAguaMensualReports}
          controlAguaTrimestralReports={controlAguaTrimestralReports}
          satisfactionForms={satisfactionForms}
          onViewReport={(report) => { setSelectedReport(report); setSelectedReportType(activeTab); }}
          onEditReport={() => {}}
          onDeleteReport={handleDeleteReport}
          fetchReportsByType={fetchReportsByType}
        />

        {activeTab !== 'limpieza_planta' && (
          <section className="panel" style={{ border: '2px solid #012b5c', backgroundColor: '#f8fafc' }}>
            <div className="panel__header">
              <h2 style={{ color: '#012b5c', fontSize: '1.5rem' }}>🏭 Gestión de Limpieza Planta</h2>
              <p>Visualiza, edita y elimina informes de limpieza organizados por zonas.</p>
            </div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', padding: '1rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ flex: '0 0 auto' }}>
                <label htmlFor="limpieza-planta-zona-filter" style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: '600' }}>Filtrar por zona</label>
                <select id="limpieza-planta-zona-filter" value={limpiezaPlantaZonaFilter} onChange={(e) => setLimpiezaPlantaZonaFilter(e.target.value)} style={{ padding: '0.65rem 2rem 0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontWeight: 500, minWidth: '140px', maxWidth: '200px', width: '100%', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23012B5C%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem center', backgroundSize: '0.65rem auto' }}>
                  <option value="TODAS">Todas las zonas</option>
                  {LIMPIEZA_PLANTA_ZONAS.map((zona) => (<option key={zona.id} value={zona.id}>{zona.nombre}</option>))}
                </select>
              </div>
              <div>
                <button type="button" className="dk-btn dk-btn--export" onClick={exportLimpiezaPlantaExcel} style={{ backgroundColor: '#012b5c', borderColor: '#012b5c' }}>📊 Exportar Excel</button>
              </div>
              <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.9rem' }}>
                Mostrando: {limpiezaPlantaZonaFilter === 'TODAS' ? `${cleaningPlantReports.length} informes` : `${filteredCleaningPlantReports.length} informe(s)`}
              </div>
            </div>
            {reportsLoading && <p>Cargando informes de limpieza...</p>}
            {reportsError && <div className="panel__error"><p>Error: {reportsError}</p><button type="button" className="dk-btn dk-btn--ghost" onClick={() => fetchReportsByType('limpieza_planta')}>Reintentar</button></div>}
            {!reportsLoading && !reportsError && cleaningPlantReports.length > 0 && (
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead><tr><th>Empleado</th><th>Fecha</th><th>Hora</th><th>Zona</th><th>Periodo</th><th>Completada</th><th style={{ minWidth: '250px' }}>Acciones</th></tr></thead>
                  <tbody>
                    {filteredCleaningPlantReports.map((report) => (
                      <tr key={report.id}>
                        <td>{report.employee_id}</td><td>{report.fecha}</td><td>{report.hora}</td><td>{report.zonaNombre || report.zona || '-'}</td><td>{report.periodo || 'SEMANAL'}</td>
                        <td><span style={{ color: report.limpiezaCompletada ? '#10b981' : '#ef4444', fontWeight: '600' }}>{report.limpiezaCompletada ? '✅ Sí' : '❌ No'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button type="button" className="dk-btn dk-btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', minWidth: '85px', backgroundColor: '#ffffff', border: '2px solid rgba(13, 34, 66, 0.3)', fontWeight: '600' }} onClick={() => { setSelectedReport(report); setSelectedReportType('limpieza_planta'); }}>👁️ Ver</button>
                            <button type="button" className="dk-btn dk-btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#c62828', borderColor: '#c62828', borderWidth: '2px', minWidth: '85px', backgroundColor: '#ffffff', fontWeight: '600' }} onClick={() => { setDeletingReportId(report.id); setDeletingReportType('limpieza_planta'); }}>🗑️ Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <WeeklySummary
          weeklySummaryRows={weeklySummaryRows}
          weeklySummaryMeta={weeklySummaryMeta}
          weeklySummaryLoading={weeklySummaryLoading}
          weeklySummaryError={weeklySummaryError}
          fetchWeeklySummary={fetchWeeklySummary}
          formatDate={formatDate}
        />

        <PendingRecords 
          pendingRecords={pendingRecords}
          adminLoading={adminLoading}
          adminError={adminError}
          onDeleteRecord={handleDeleteRecord}
          setEditingRecord={setEditingRecord}
        />
      </main>

      <footer className="app-footer">
        <BrandLogo />
        <p>© {new Date().getFullYear()} DK Tegoria · Plataforma de horas</p>
        <div className="footer-links">
          <a href="#politicas">Políticas internas</a>
          <a href="#soporte">Soporte</a>
        </div>
      </footer>

      {renderNotifications()}

      {/* Modal de edición de registro */}
      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Editar Registro</h2>
              <button type="button" className="modal-close" onClick={() => setEditingRecord(null)} aria-label="Cerrar">×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const updatedData = {
                  employee_id: formData.get('employee_id'),
                  date: formData.get('date'),
                  check_in: formData.get('check_in') || null,
                  check_out: formData.get('check_out') || null,
                  notes: formData.get('notes') || '',
                };
                handleUpdateRecord(editingRecord.id, updatedData);
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Empleado:</label>
                  <input type="text" name="employee_id" defaultValue={editingRecord.employee_id} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Fecha:</label>
                  <input type="date" name="date" defaultValue={editingRecord.date} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Entrada:</label>
                  <input type="datetime-local" name="check_in" defaultValue={editingRecord.check_in ? new Date(editingRecord.check_in).toISOString().slice(0, 16) : ''} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Salida:</label>
                  <input type="datetime-local" name="check_out" defaultValue={editingRecord.check_out ? new Date(editingRecord.check_out).toISOString().slice(0, 16) : ''} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Notas:</label>
                  <textarea name="notes" defaultValue={editingRecord.notes || ''} rows="3" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="dk-btn dk-btn--ghost" onClick={() => setEditingRecord(null)}>Cancelar</button>
                  <button type="submit" className="dk-btn dk-btn--primary">Guardar cambios</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles de informe */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => { setSelectedReport(null); setSelectedReportType(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalles del Informe</h2>
              <button type="button" className="modal-close" onClick={() => { setSelectedReport(null); setSelectedReportType(null); }} aria-label="Cerrar">×</button>
            </div>
            <div className="modal-body">
              <div className="report-details">
                <div className="report-detail-item"><strong>Empleado:</strong><span>{selectedReport.employee_id}</span></div>
                <div className="report-detail-item"><strong>Fecha:</strong><span>{selectedReport.fecha}</span></div>
                <div className="report-detail-item"><strong>Hora:</strong><span>{selectedReport.hora}</span></div>
                {selectedReportType === 'limpieza_planta' && (
                  <>
                    <div className="report-detail-item"><strong>Zona:</strong><span>{(selectedReport.zonaNombre || selectedReport.zona) ?? '-'}</span></div>
                    <div className="report-detail-item"><strong>Periodo:</strong><span>{selectedReport.periodo || 'SEMANAL'}</span></div>
                    <div className="report-detail-item"><strong>Limpieza completada:</strong><span>{selectedReport.limpiezaCompletada ? 'Sí' : 'No'}</span></div>
                  </>
                )}
                <div className="report-detail-item"><strong>Fecha de creación:</strong><span>{selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : '-'}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="dk-btn dk-btn--primary" onClick={() => { setSelectedReport(null); setSelectedReportType(null); }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {(deletingRecordId || deletingReportId) && (
        <div className="modal-overlay" onClick={() => { setDeletingRecordId(null); setDeletingReportId(null); setDeletingReportType(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar eliminación</h2>
              <button type="button" className="modal-close" onClick={() => { setDeletingRecordId(null); setDeletingReportId(null); setDeletingReportType(null); }} aria-label="Cerrar">×</button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="dk-btn dk-btn--ghost" onClick={() => { setDeletingRecordId(null); setDeletingReportId(null); setDeletingReportType(null); }}>Cancelar</button>
              <button type="button" className="dk-btn dk-btn--primary" style={{ background: '#c62828' }} onClick={async () => {
                if (deletingRecordId) {
                  await handleDeleteRecord(deletingRecordId);
                  setDeletingRecordId(null);
                } else if (deletingReportId && deletingReportType) {
                  await handleDeleteReport(deletingReportId);
                  setDeletingReportId(null);
                  setDeletingReportType(null);
                }
              }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
