import React, { useState, useEffect } from 'react';
import { emailsApi } from '../services/api';
import EmailModal from '../components/EmailModal';

const Dashboard = () => {
  const [emails, setEmails] = useState([]);
  const [allEmails, setAllEmails] = useState([]); // Wszystkie maile dla statystyk
  const [companies, setCompanies] = useState([]); // Lista firm z kontaktów
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null); // Email do wyświetlenia w modalu
  const [filters, setFilters] = useState({
    search: '',
    company: '',
    status: ''
  });

  useEffect(() => {
    fetchEmails();
    fetchAllEmailsForStats();
    fetchCompanies();
  }, []);

  const fetchAllEmailsForStats = async () => {
    try {
      const response = await emailsApi.getAll();
      setAllEmails(response.data);
    } catch (error) {
      console.error('Error fetching all emails:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await emailsApi.getCompanies();
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchEmails = async (filterParams = {}) => {
    try {
      setLoading(true);
      const response = await emailsApi.getAll(filterParams);
      setEmails(response.data);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    const params = {};
    if (newFilters.search) params.search = newFilters.search;
    if (newFilters.company) params.company = newFilters.company;
    if (newFilters.status) params.status = newFilters.status;
    
    fetchEmails(params);
  };

  const handleFetchEmails = async () => {
    setFetching(true);
    try {
      const response = await emailsApi.fetchEmails();
      const data = response.data;
      
      if (data.success) {
        alert(`Pobrano ${data.newEmails} nowych maili!`);
        fetchEmails(); // Odśwież listę
        fetchAllEmailsForStats(); // Odśwież statystyki
        fetchCompanies(); // Odśwież listę firm
      } else {
        alert('Błąd: ' + data.message);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      alert('Błąd połączenia z serwerem: ' + (error.response?.data?.message || error.message));
    } finally {
      setFetching(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      positive: 'Pozytywna',
      neutral: 'Neutralna',
      negative: 'Negatywna'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Przed chwilą';
    if (diffInHours < 24) return `${diffInHours} godz. temu`;
    return `${Math.floor(diffInHours / 24)} dni temu`;
  };

  const stats = {
    positive: allEmails.filter(e => e.status === 'positive').length,
    neutral: allEmails.filter(e => e.status === 'neutral').length,
    negative: allEmails.filter(e => e.status === 'negative').length,
    total: allEmails.length
  };

  const handleStatClick = (status) => {
    const newFilters = { ...filters, status };
    setFilters(newFilters);
    fetchEmails({ status });
  };

  const handleExportToExcel = () => {
    if (emails.length === 0) {
      alert('Brak maili do eksportu');
      return;
    }

    // Przygotuj dane CSV
    const csvHeader = 'Data;Nadawca;Firma;Temat;Podgląd;Status\n';
    const csvRows = emails.map(email => {
      const date = formatDate(email.receivedAt);
      const sender = email.sender.replace(/;/g, ',');
      const company = email.company.replace(/;/g, ',');
      const subject = email.subject.replace(/;/g, ',');
      const preview = email.preview.replace(/;/g, ',').substring(0, 100);
      const status = getStatusLabel(email.status);
      
      return `${date};${sender};${company};${subject};${preview};${status}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    
    // Dodaj BOM dla polskich znaków
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Pobierz plik
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const statusFilter = filters.status ? `_${filters.status}` : '';
    link.setAttribute('download', `maile${statusFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteEmail = async (emailId, e) => {
    e.stopPropagation(); // Zatrzymaj propagację kliknięcia, aby nie otwierał modala
    
    if (!window.confirm('Czy na pewno chcesz usunąć ten email?')) {
      return;
    }

    try {
      await emailsApi.delete(emailId);
      // Usuń email z listy lokalnie
      setEmails(emails.filter(email => email.id !== emailId));
      setAllEmails(allEmails.filter(email => email.id !== emailId));
      alert('Email został usunięty');
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Błąd podczas usuwania emaila');
    }
  };

  return (
    <div className="container">
      {selectedEmail && (
        <EmailModal 
          email={selectedEmail} 
          onClose={() => setSelectedEmail(null)} 
        />
      )}
      
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Dashboard Email</h1>
            <p className="page-subtitle">Agregacja i zarządzanie wiadomościami email</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleFetchEmails}
            disabled={fetching}
            style={{ height: 'fit-content' }}
          >
            {fetching ? '⏳ Pobieranie...' : '📧 Pobierz nowe maile'}
          </button>
        </div>
      </div>

      <div className="main-layout">
        <aside className="sidebar">
          <h3>Filtry</h3>
          
          <div className="filter-group">
            <label htmlFor="search">Szukaj</label>
            <input
              type="text"
              id="search"
              name="search"
              className="filter-input"
              placeholder="Szukaj wiadomości..."
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="company">Firma</label>
            <select
              id="company"
              name="company"
              className="filter-input"
              value={filters.company}
              onChange={handleFilterChange}
            >
              <option value="">Wszystkie firmy</option>
              {companies.map((company, index) => (
                <option key={index} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="status">Status odpowiedzi</label>
            <select
              id="status"
              name="status"
              className="filter-input"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">Wszystkie</option>
              <option value="positive">Pozytywne</option>
              <option value="neutral">Neutralne</option>
              <option value="negative">Negatywne</option>
            </select>
            {filters.status && (
              <button 
                className="btn btn-secondary" 
                style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.85rem' }}
                onClick={() => {
                  setFilters({ ...filters, status: '' });
                  fetchEmails({ ...filters, status: '' });
                }}
              >
                ✕ Wyczyść filtr
              </button>
            )}
          </div>
        </aside>

        <div className="content-area">
          <div className="stats-grid">
            <div 
              className="stat-card" 
              onClick={() => handleStatClick('positive')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-number positive">{stats.positive}</div>
              <div className="stat-label">Pozytywne odpowiedzi</div>
            </div>
            <div 
              className="stat-card"
              onClick={() => handleStatClick('neutral')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-number neutral">{stats.neutral}</div>
              <div className="stat-label">Do przejrzenia</div>
            </div>
            <div 
              className="stat-card"
              onClick={() => handleStatClick('negative')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-number negative">{stats.negative}</div>
              <div className="stat-label">Odmowy kontaktu</div>
            </div>
            <div 
              className="stat-card"
              onClick={() => handleStatClick('')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Łączna liczba maili</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                Lista wiadomości
                {filters.status && (
                  <span style={{ marginLeft: '1rem', fontSize: '0.9rem', color: '#666' }}>
                    (Filtr: {getStatusLabel(filters.status)})
                  </span>
                )}
              </h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={handleExportToExcel}
                  disabled={emails.length === 0}
                >
                  📊 Eksport do Excel
                </button>
              </div>
            </div>

            <div className="email-list">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  Ładowanie...
                </div>
              ) : emails.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔭</div>
                  <p>Brak wiadomości. Dodaj pierwszą wiadomość!</p>
                </div>
              ) : (
                emails.map((email) => (
                  <div 
                    key={email.id} 
                    className="email-item"
                    onClick={() => setSelectedEmail(email)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    <div className="email-header">
                      <div>
                        <span className="email-sender">{email.sender}</span>
                        <span className="email-company">{email.company}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="email-time">{formatDate(email.receivedAt)}</span>
                        <button
                          className="btn btn-danger"
                          onClick={(e) => handleDeleteEmail(email.id, e)}
                          style={{ 
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.85rem',
                            minWidth: 'auto'
                          }}
                          title="Usuń email"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="email-subject">{email.subject}</div>
                    <div className="email-preview">{email.preview}</div>
                    <div className="email-tags">
                      <span className={`tag ${email.status}`}>
                        {getStatusLabel(email.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
