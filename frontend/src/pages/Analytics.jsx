import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`${API_URL}/analytics/dashboard`);
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Analityka i raporty</h1>
          <p className="page-subtitle">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Analityka i raporty</h1>
          <p className="page-subtitle">Brak danych do wyświetlenia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Analityka i raporty</h1>
        <p className="page-subtitle">Szczegółowe analizy wydajności i KPI</p>
      </div>

      {/* Email Statistics */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">Statystyki Email</h2>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#007AFF' }}>{stats.emails.total}</div>
            <div className="stat-label">Wszystkie Emaile</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#34C759' }}>
              {stats.emails.positive}
            </div>
            <div className="stat-label">Pozytywne</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {stats.emails.total > 0 ? `${stats.emails.positiveRate?.toFixed(1)}%` : '0%'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#FF9500' }}>
              {stats.emails.neutral}
            </div>
            <div className="stat-label">Neutralne</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {stats.emails.total > 0 ? `${stats.emails.neutralRate?.toFixed(1)}%` : '0%'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#FF3B30' }}>
              {stats.emails.negative}
            </div>
            <div className="stat-label">Negatywne</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {stats.emails.total > 0 ? `${stats.emails.negativeRate?.toFixed(1)}%` : '0%'}
            </div>
          </div>
        </div>
      </div>

      {/* Deal Statistics */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">Pipeline i Deale</h2>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#007AFF' }}>{stats.deals.open}</div>
            <div className="stat-label">Aktywne Deale</div>
            <div style={{ fontSize: '14px', color: '#34C759', marginTop: '5px', fontWeight: '600' }}>
              {stats.deals.openValue?.toLocaleString()} PLN
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#34C759' }}>{stats.deals.won}</div>
            <div className="stat-label">Wygrane Deale</div>
            <div style={{ fontSize: '14px', color: '#34C759', marginTop: '5px', fontWeight: '600' }}>
              {stats.deals.wonValue?.toLocaleString()} PLN
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#FF3B30' }}>{stats.deals.lost}</div>
            <div className="stat-label">Przegrane Deale</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#5856D6' }}>
              {stats.deals.winRate?.toFixed(1)}%
            </div>
            <div className="stat-label">Win Rate</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Wskaźnik wygranych dealów
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Contact Statistics */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Kontakty</h2>
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div className="stat-number" style={{ color: '#007AFF', fontSize: '48px' }}>
              {stats.totalContacts}
            </div>
            <div className="stat-label">Wszystkie Kontakty</div>
          </div>
        </div>

        {/* Task Statistics */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Zadania</h2>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="stat-number" style={{ color: '#FF9500', fontSize: '36px' }}>
                  {stats.tasks.pending}
                </div>
                <div className="stat-label">Oczekujące</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="stat-number" style={{ color: '#FF3B30', fontSize: '36px' }}>
                  {stats.tasks.overdue}
                </div>
                <div className="stat-label">Spóźnione</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Statistics */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Kampanie</h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="stat-number" style={{ color: '#007AFF', fontSize: '36px' }}>
                {stats.campaigns.total}
              </div>
              <div className="stat-label">Wszystkie Kampanie</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="stat-number" style={{ color: '#34C759', fontSize: '36px' }}>
                {stats.campaigns.active}
              </div>
              <div className="stat-label">Aktywne Kampanie</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card" style={{ marginTop: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ padding: '30px', color: 'white', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>Podsumowanie</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '20px' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totalContacts}</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Kontaktów</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.emails.total}</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Emaili</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.deals.open}</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Aktywnych Dealów</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.campaigns.active}</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Aktywnych Kampanii</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
