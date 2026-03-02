import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const WorkerHistory = ({ 
  adminRecords, 
  adminLoading, 
  adminError, 
  totalWorkedHours,
  onDeleteRecord,
  onUpdateRecord,
  setEditingRecord 
}) => {
  const [historyRecordsLimit, setHistoryRecordsLimit] = useState(10);

  const completedRecords = adminRecords.filter(
    (record) => record.check_in && record.check_out,
  );

  useEffect(() => {
    setHistoryRecordsLimit(10);
  }, [adminRecords.length]);

  const applyHeaderStyle = (worksheet) => {
    if (!worksheet || !worksheet['!ref']) return;
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ c: C, r: 0 });
      const cell = worksheet[address];
      if (!cell) continue;
      cell.s = {
        fill: {
          patternType: 'solid',
          fgColor: { rgb: '012B5C' },
        },
        font: {
          color: { rgb: 'FFFFFF' },
          bold: true,
        },
      };
    }
  };

  const exportToExcel = () => {
    if (adminRecords.length === 0) {
      return;
    }

    const excelData = adminRecords.map((record) => ({
      Empleado: record.employee_id,
      Fecha: record.date,
      Entrada: record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-',
      Salida: record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-',
      Horas: record.worked_hours ?? '-',
      Estado: record.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    applyHeaderStyle(worksheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial');

    const fecha = new Date().toISOString().split('T')[0];
    const fileName = `historial_trabajadores_${fecha}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
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
              marginBottom: '1rem', 
              padding: '1rem', 
              backgroundColor: '#f8fafc', 
              borderRadius: '12px',
              border: '2px solid #e6eaf3',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: '700', color: '#0c3c7c', fontSize: '0.95rem', marginRight: '0.5rem' }}>⚡ Acciones rápidas:</span>
              <button
                type="button"
                className="dk-btn dk-btn--primary"
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
                onClick={() => { if (adminRecords.length > 0) setEditingRecord(adminRecords[0]); }}
                disabled={adminRecords.length === 0}
              >
                ✏️ Editar primer registro
              </button>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                (Usa los botones en cada fila para acciones específicas)
              </span>
            </div>
          )}
          <div className="records-table-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="records-table">
              <thead>
                <tr>
                  <th>Empleado</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Estado</th>
                  <th style={{ minWidth: '160px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {completedRecords.length === 0 ? (
                  <tr><td colSpan="7">No hay registros recientes.</td></tr>
                ) : (
                  completedRecords.slice(0, historyRecordsLimit).map((record) => (
                    <tr key={record.id}>
                      <td>{record.employee_id}</td><td>{record.date}</td>
                      <td>{record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-'}</td>
                      <td>{record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-'}</td>
                      <td>{record.worked_hours ?? '-'}</td><td>{record.status}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap' }}>
                          <button type="button" className="dk-btn dk-btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', minWidth: '85px', backgroundColor: '#ffffff', border: '2px solid rgba(13, 34, 66, 0.3)', fontWeight: '600' }} onClick={() => setEditingRecord(record)}>✏️ Editar</button>
                          <button type="button" className="dk-btn dk-btn--ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#c62828', borderColor: '#c62828', borderWidth: '2px', minWidth: '85px', backgroundColor: '#ffffff', fontWeight: '600' }} onClick={() => onDeleteRecord(record.id)}>🗑️ Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default WorkerHistory;
