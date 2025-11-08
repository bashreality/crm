import React from 'react';

const Analytics = () => {
  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Analityka i raporty</h1>
        <p className="page-subtitle">Szczegółowe analizy wydajności i KPI</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#007AFF' }}>94.2%</div>
          <div className="stat-label">Skuteczność doręczeń</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#34C759' }}>31.5%</div>
          <div className="stat-label">Wskaźnik otwarć</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#FF9500' }}>12.8%</div>
          <div className="stat-label">Click-through rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#5856D6' }}>€127K</div>
          <div className="stat-label">Przychód z kampanii</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Wydajność kampanii</h2>
          <button className="btn btn-secondary">Eksport raportu</button>
        </div>
        <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
          <p>Wykres wydajności kampanii będzie tutaj wyświetlony</p>
          <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
            Możesz dodać wykresy używając bibliotek takich jak Chart.js lub Recharts
          </p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
