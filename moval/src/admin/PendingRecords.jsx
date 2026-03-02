import React, { useState } from 'react';

const PendingRecords = ({ 
  pendingRecords, 
  adminLoading, 
  adminError, 
  onDeleteRecord, 
  setEditingRecord 
}) => {
  const [pendingRecordsLimit, setPendingRecordsLimit] = useState(10);

  return (
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
          style={{ maxHeight: '600px', overflowY: 'auto' }}
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
                <th style={{ minWidth: '180px' }}>Acciones</th>
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
                        : '-'}
                    </td>
                    <td>{record.notes || '-'}</td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'nowrap',
                          alignItems: 'center',
                        }}
                      >
                        <button
                          type="button"
                          className="dk-btn dk-btn--ghost"
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            minWidth: '80px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            backgroundColor: '#ffffff',
                            border: '2px solid rgba(13, 34, 66, 0.3)',
                            fontWeight: '600',
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
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            minWidth: '80px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            backgroundColor: '#ffffff',
                            color: '#c62828',
                            borderColor: '#c62828',
                            borderWidth: '2px',
                            fontWeight: '600',
                          }}
                          onClick={() => onDeleteRecord(record.id)}
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
                  <td colSpan="5" style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontStyle: 'italic' }}>
                    Mostrando {pendingRecordsLimit} de {pendingRecords.length} registros. Desplázate para ver más...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default PendingRecords;
