import React, { useState, useEffect } from 'react';
import { emailsApi, emailAccountsApi, analyticsApi, tasksApi, contactsApi } from '../services/api';
import EmailModal from '../components/EmailModal';

const Dashboard = () => {
  const [emails, setEmails] = useState([]);
  const [companies, setCompanies] = useState([]); // Lista firm z kontaktów
  const [emailAccounts, setEmailAccounts] = useState([]); // Lista kont email
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null); // Email do wyświetlenia w modalu
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    contactId: null,
    relatedEmailId: null
  });
  const [contacts, setContacts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all'); // Wybrane konto email ('all' = wszystkie)
  const [statsState, setStatsState] = useState(null); // Statystyki dla bieżącego widoku (konto/all)
  const [filters, setFilters] = useState({
    search: '',
    company: '',
    status: '',
    accountId: ''
  });
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyFormData, setReplyFormData] = useState({
    subject: '',
    body: '',
    emailId: null
  });
  const [loadingAISuggestion, setLoadingAISuggestion] = useState(false);

  useEffect(() => {
    fetchEmails();
    fetchCompanies();
    fetchEmailAccounts();
    fetchContacts();
    // Załaduj statystyki dla domyślnego widoku (wszystkie skrzynki)
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    // Odśwież statystyki gdy zmieni się wybrane konto
    if (selectedAccount === 'all') {
      fetchGlobalStats();
    } else {
      fetchAccountStats(selectedAccount);
    }
  }, [selectedAccount]);

  const fetchGlobalStats = async () => {
    try {
      const response = await analyticsApi.getDashboard();
      setStatsState(response.data.emails);
    } catch (error) {
      console.error('Error fetching global stats:', error);
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

  const fetchEmailAccounts = async () => {
    try {
      const response = await emailAccountsApi.getAll();
      setEmailAccounts(response.data);
    } catch (error) {
      console.error('Error fetching email accounts:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await contactsApi.getAll();
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchAccountStats = async (accountId) => {
    try {
      const response = await analyticsApi.getAccountStats(accountId);
      setStatsState(response.data);
    } catch (error) {
      console.error('Error fetching account stats:', error);
    }
  };

  const fetchEmails = async (filterParams = {}) => {
    try {
      setLoading(true);
      const response = await emailsApi.getAll(filterParams);
      const sorted = [...response.data].sort(
        (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)
      );
      setEmails(sorted);
      // Jeśli filtrujemy konkretne konto, policz statystyki na podstawie zwróconej listy
      const hasAccountFilter =
        (filterParams.accountId && filterParams.accountId !== 'all') ||
        (filters.accountId && filters.accountId !== '');
      if (hasAccountFilter) {
        const positive = sorted.filter(e => e.status === 'positive').length;
        const neutral = sorted.filter(e => e.status === 'neutral').length;
        const negative = sorted.filter(e => e.status === 'negative').length;
        setStatsState({
          positive,
          neutral,
          negative,
          total: sorted.length
        });
      }
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
    if (newFilters.accountId) params.accountId = newFilters.accountId;

    fetchEmails(params);
  };

  const handleAccountChange = (e) => {
    const accountId = e.target.value;
    setSelectedAccount(accountId);

    const newFilters = {
      ...filters,
      accountId: accountId === 'all' ? '' : accountId
    };
    setFilters(newFilters);

    const params = {};
    if (newFilters.search) params.search = newFilters.search;
    if (newFilters.company) params.company = newFilters.company;
    if (newFilters.status) params.status = newFilters.status;
    if (newFilters.accountId) params.accountId = newFilters.accountId;

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
    positive: statsState?.positive || 0,
    neutral: statsState?.neutral || 0,
    negative: statsState?.negative || 0,
    total: statsState?.total || 0
  };

  const handleStatClick = (status) => {
    const newFilters = { ...filters, status };
    setFilters(newFilters);
    const params = {};
    if (newFilters.search) params.search = newFilters.search;
    if (newFilters.company) params.company = newFilters.company;
    if (newFilters.status) params.status = newFilters.status;
    if (newFilters.accountId) params.accountId = newFilters.accountId;
    fetchEmails(params);
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
      alert('Email został usunięty');
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Błąd podczas usuwania emaila');
    }
  };

  const handleCreateTask = (email, e) => {
    e.stopPropagation(); // Zatrzymaj propagację, aby nie otworzyć modala emaila

    // Znajdź kontakt na podstawie emaila nadawcy
    const emailAddress = email.sender.match(/<(.+)>/)?.[1] || email.sender;
    const contact = contacts.find(c => c.email === emailAddress);

    setTaskFormData({
      title: `Zadanie: ${email.subject}`,
      description: `Email od: ${email.sender}\n\n${email.preview}`,
      dueDate: '',
      contactId: contact?.id || null,
      relatedEmailId: email.id
    });
    setShowTaskModal(true);
  };

  const handleTaskFormChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();

    if (!taskFormData.title || !taskFormData.dueDate) {
      alert('Wypełnij tytuł i datę wykonania');
      return;
    }

    try {
      const payload = {
        title: taskFormData.title.trim(),
        description: taskFormData.description?.trim() || null,
        type: 'email',
        dueDate: taskFormData.dueDate ? `${taskFormData.dueDate}:00` : null,
        priority: 2, // Medium priority
        completed: false,
        contact: taskFormData.contactId
          ? { id: Number(taskFormData.contactId) }
          : null,
      };

      await tasksApi.create(payload);
      alert('✅ Zadanie zostało utworzone!');
      setShowTaskModal(false);
      setTaskFormData({
        title: '',
        description: '',
        dueDate: '',
        contactId: null,
        relatedEmailId: null
      });
    } catch (error) {
      console.error('Error creating task:', error);
      alert('❌ Błąd podczas tworzenia zadania');
    }
  };

  const handleReply = (email, e) => {
    e.stopPropagation(); // Zatrzymaj propagację, aby nie otworzyć modala emaila

    setReplyFormData({
      subject: `Re: ${email.subject}`,
      body: '',
      emailId: email.id
    });
    setShowReplyModal(true);
  };

  const handleReplyFormChange = (e) => {
    const { name, value } = e.target;
    setReplyFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGetAISuggestion = async () => {
    if (!replyFormData.emailId) return;

    setLoadingAISuggestion(true);
    try {
      const response = await emailsApi.suggestReply(replyFormData.emailId);
      setReplyFormData(prev => ({
        ...prev,
        subject: response.data.subject,
        body: response.data.suggestion
      }));
      alert('✅ Sugestia AI została załadowana!');
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      alert('❌ Błąd podczas pobierania sugestii AI');
    } finally {
      setLoadingAISuggestion(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();

    if (!replyFormData.subject || !replyFormData.body) {
      alert('Wypełnij temat i treść odpowiedzi');
      return;
    }

    try {
      await emailsApi.sendReply(replyFormData.emailId, {
        subject: replyFormData.subject.trim(),
        body: replyFormData.body.trim()
      });
      alert('✅ Odpowiedź została wysłana!');
      setShowReplyModal(false);
      setReplyFormData({
        subject: '',
        body: '',
        emailId: null
      });
      // Odśwież listę emaili aby pokazać status "replied"
      fetchEmails();
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('❌ Błąd podczas wysyłania odpowiedzi');
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

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Utwórz nowe zadanie</h2>
              <button className="modal-close" onClick={() => setShowTaskModal(false)}>×</button>
            </div>
            <form onSubmit={handleTaskSubmit} className="modal-body">
              <div className="form-group">
                <label htmlFor="taskTitle">Tytuł zadania *</label>
                <input
                  type="text"
                  id="taskTitle"
                  name="title"
                  className="form-control"
                  value={taskFormData.title}
                  onChange={handleTaskFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskDescription">Opis</label>
                <textarea
                  id="taskDescription"
                  name="description"
                  className="form-control"
                  rows="4"
                  value={taskFormData.description}
                  onChange={handleTaskFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskDueDate">Data i godzina wykonania *</label>
                <input
                  type="datetime-local"
                  id="taskDueDate"
                  name="dueDate"
                  className="form-control"
                  value={taskFormData.dueDate}
                  onChange={handleTaskFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskContact">Przypisz do kontaktu</label>
                <select
                  id="taskContact"
                  name="contactId"
                  className="form-control"
                  value={taskFormData.contactId || ''}
                  onChange={handleTaskFormChange}
                >
                  <option value="">Wybierz kontakt (opcjonalnie)</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} ({contact.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  Utwórz zadanie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReplyModal && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Odpowiedz na email</h2>
              <button className="modal-close" onClick={() => setShowReplyModal(false)}>×</button>
            </div>
            <form onSubmit={handleSendReply} className="modal-body">
              <div className="form-group">
                <label htmlFor="replySubject">Temat *</label>
                <input
                  type="text"
                  id="replySubject"
                  name="subject"
                  className="form-control"
                  value={replyFormData.subject}
                  onChange={handleReplyFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="replyBody">Treść odpowiedzi *</label>
                <textarea
                  id="replyBody"
                  name="body"
                  className="form-control"
                  rows="10"
                  value={replyFormData.body}
                  onChange={handleReplyFormChange}
                  required
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleGetAISuggestion}
                  disabled={loadingAISuggestion}
                >
                  {loadingAISuggestion ? '⏳ Ładowanie...' : '🤖 Sugestia AI'}
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReplyModal(false)}>
                    Anuluj
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Wyślij odpowiedź
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
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
            <label htmlFor="account">Konto Email</label>
            <select
              id="account"
              name="account"
              className="filter-input"
              value={selectedAccount}
              onChange={handleAccountChange}
            >
              <option value="all">🌐 Wszystkie konta ({emailAccounts.length})</option>
              {emailAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  📧 {account.displayName}
                </option>
              ))}
            </select>
          </div>

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="email-time">{formatDate(email.receivedAt)}</span>
                        <button
                          className="btn btn-primary"
                          onClick={(e) => handleCreateTask(email, e)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.85rem',
                            minWidth: 'auto'
                          }}
                          title="Utwórz zadanie"
                        >
                          ✓
                        </button>
                        <button
                          className="btn"
                          onClick={(e) => handleReply(email, e)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.85rem',
                            minWidth: 'auto',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none'
                          }}
                          title="Odpowiedz"
                        >
                          ↩️
                        </button>
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
