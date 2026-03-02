import React from 'react';

const WeeklySummary = ({ 
  weeklySummaryRows, 
  weeklySummaryMeta, 
  weeklySummaryLoading, 
  weeklySummaryError,
  fetchWeeklySummary,
  formatDate 
}) => {
  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Control semanal</h2>
        <p>Recuento semanal de informes y desviaciones.</p>
      </div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="dk-btn dk-btn--primary" onClick={fetchWeeklySummary} style={{ padding: '0.5rem 1rem' }} disabled={weeklySummaryLoading}>
          {weeklySummaryLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
        {weeklySummaryMeta && <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Semana: {formatDate(weeklySummaryMeta.start)} – {formatDate(weeklySummaryMeta.end)}</span>}
      </div>
      {weeklySummaryError && <div className="panel__error"><p>Error: {weeklySummaryError}</p></div>}
      {!weeklySummaryLoading && !weeklySummaryError && weeklySummaryRows.length > 0 && (
        <div className="records-table-wrapper">
          <table className="records-table">
            <thead><tr><th>Área controlada</th><th>Registros real</th><th>Desviaciones</th><th>Estado</th></tr></thead>
            <tbody>
              {weeklySummaryRows.map((row) => (
                <tr key={row.area}>
                  <td>{row.area}</td>
                  <td>{row.registros}</td>
                  <td>{row.desviaciones.count}</td>
                  <td>{row.desviaciones.count > 0 ? 'NO CONFORME' : 'CONFORME'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default WeeklySummary;
