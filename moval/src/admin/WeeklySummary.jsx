import React, { useState } from 'react';

const WeeklySummary = ({ 
  weeklySummaryRows, 
  weeklySummaryMeta, 
  weeklySummaryLoading, 
  weeklySummaryError,
  fetchWeeklySummary,
  formatDate,
  productionTypes = []
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleFilter = () => {
    if (startDate && endDate) {
      fetchWeeklySummary({ start: startDate, end: endDate });
    }
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Control semanal</h2>
        <p>Recuento semanal de informes y desviaciones.</p>
      </div>
      
      {/* Date filters */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: '0 0 auto' }}>
          <label htmlFor="start-date" style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: '600', fontSize: '0.9rem' }}>Fecha inicio</label>
          <input 
            type="date" 
            id="start-date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <label htmlFor="end-date" style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: '600', fontSize: '0.9rem' }}>Fecha fin</label>
          <input 
            type="date" 
            id="end-date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
        </div>
        <button 
          type="button" 
          className="dk-btn dk-btn--primary" 
          onClick={handleFilter}
          disabled={!startDate || !endDate || weeklySummaryLoading}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          Filtrar
        </button>
        <button 
          type="button" 
          className="dk-btn dk-btn--ghost" 
          onClick={() => {
            setStartDate('');
            setEndDate('');
            fetchWeeklySummary();
          }}
          disabled={weeklySummaryLoading}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          Restablecer
        </button>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="dk-btn dk-btn--primary" onClick={() => fetchWeeklySummary(startDate && endDate ? { start: startDate, end: endDate } : null)} style={{ padding: '0.5rem 1rem' }} disabled={weeklySummaryLoading}>
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

      {/* Production types summary */}
      {productionTypes.length > 0 && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ margin: '0 0 0.75rem', color: '#166534', fontSize: '1rem', fontWeight: '600' }}>📦 Tipos de producto producidos</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {productionTypes.map((type, index) => (
              <span key={index} style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#ffffff', 
                borderRadius: '8px', 
                border: '1px solid #86efac',
                color: '#166534',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                {type}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default WeeklySummary;
