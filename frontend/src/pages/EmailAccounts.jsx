import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Mail,
  Plus,
  Edit3,
  Trash2,
  Power,
  Server,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield,
  Send,
  Inbox,
  Settings
} from 'lucide-react';
import api from '../services/api';
import SignatureEditor from '../components/SignatureEditor';
import '../styles/EmailAccounts.css';

const EmailAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    emailAddress: '',
    password: '',
    displayName: '',
    imapHost: 'mail.q-prospect.pl',
    imapPort: 993,
    imapProtocol: 'imaps',
    smtpHost: 'mail.q-prospect.pl',
    smtpPort: 465,
    enabled: true,
    signature: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/email-accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching email accounts:', error);
      toast.error('Błąd podczas pobierania kont email');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingAccount) {
        // Update existing account
        await api.put(`/email-accounts/${editingAccount.id}`, formData);
        toast.success('Konto email zaktualizowane');
      } else {
        // Create new account
        await api.post('/email-accounts', formData);
        toast.success('Konto email utworzone');
      }

      setShowModal(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error('Error saving email account:', error);
      toast.error('Błąd podczas zapisywania konta email');
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      emailAddress: account.emailAddress,
      password: '', // Pozostaw puste - użytkownik wprowadzi nowe tylko jeśli chce zmienić
      displayName: account.displayName || '',
      imapHost: account.imapHost || 'mail.q-prospect.pl',
      imapPort: account.imapPort || 993,
      imapProtocol: account.imapProtocol || 'imaps',
      smtpHost: account.smtpHost || 'mail.q-prospect.pl',
      smtpPort: account.smtpPort || 465,
      enabled: account.enabled !== undefined ? account.enabled : true,
      signature: account.signature || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to konto email?')) {
      return;
    }

    try {
      await api.delete(`/email-accounts/${accountId}`);
      toast.success('Konto email usunięte');
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting email account:', error);
      const msg = error.response?.data?.message || 'Błąd podczas usuwania konta email';
      toast.error(msg);
    }
  };

  const toggleEnabled = async (account) => {
    try {
      await api.put(`/email-accounts/${account.id}`, {
        ...account,
        enabled: !account.enabled
      });
      toast.success(account.enabled ? 'Konto dezaktywowane' : 'Konto aktywowane');
      fetchAccounts();
    } catch (error) {
      console.error('Error toggling account status:', error);
      toast.error('Błąd podczas zmiany statusu konta');
    }
  };

  const resetForm = () => {
    setEditingAccount(null);
    setFormData({
      emailAddress: '',
      password: '',
      displayName: '',
      imapHost: 'mail.q-prospect.pl',
      imapPort: 993,
      imapProtocol: 'imaps',
      smtpHost: 'mail.q-prospect.pl',
      smtpPort: 465,
      enabled: true,
      signature: ''
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Calculate stats
  const activeAccounts = accounts.filter(a => a.enabled).length;
  const totalEmails = accounts.reduce((sum, a) => sum + (a.emailCount || 0), 0);

  if (loading) {
    return (
      <div className="ea-container">
        <div className="ea-loading">
          <RefreshCw size={32} className="spin" />
          <span>Ładowanie kont email...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ea-container">
      {/* Page Header */}
      <div className="ea-header">
        <div className="ea-header-content">
          <div className="ea-header-icon">
            <Mail size={32} />
          </div>
          <div>
            <h1>Konta</h1>
            <p>Zarządzaj kontami email do wysyłki i odbierania wiadomości</p>
          </div>
        </div>
        <div className="ea-header-actions">
          <button className="btn btn-secondary" onClick={fetchAccounts}>
            <RefreshCw size={18} /> Odśwież
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Dodaj konto
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="ea-stats-grid">
        <div className="ea-stat-card">
          <div className="ea-stat-icon total">
            <Mail size={24} />
          </div>
          <div className="ea-stat-content">
            <div className="ea-stat-value">{accounts.length}</div>
            <div className="ea-stat-label">Wszystkie konta</div>
          </div>
        </div>
        <div className="ea-stat-card">
          <div className="ea-stat-icon active">
            <CheckCircle size={24} />
          </div>
          <div className="ea-stat-content">
            <div className="ea-stat-value">{activeAccounts}</div>
            <div className="ea-stat-label">Aktywne konta</div>
          </div>
        </div>
        <div className="ea-stat-card">
          <div className="ea-stat-icon emails">
            <Inbox size={24} />
          </div>
          <div className="ea-stat-content">
            <div className="ea-stat-value">{totalEmails.toLocaleString()}</div>
            <div className="ea-stat-label">Łącznie emaili</div>
          </div>
        </div>
      </div>

      {/* Accounts Content */}
      <div className="ea-content">
        {accounts.length === 0 ? (
          <div className="ea-empty-state">
            <div className="ea-empty-icon">
              <Mail size={64} />
            </div>
            <h3>Brak kont email</h3>
            <p>Dodaj pierwsze konto email, aby rozpocząć wysyłkę i odbieranie wiadomości.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} /> Dodaj konto email
            </button>
          </div>
        ) : (
          <div className="ea-accounts-grid">
            {accounts.map(account => (
              <div key={account.id} className={`ea-account-card ${!account.enabled ? 'disabled' : ''}`}>
                <div className="ea-account-header">
                  <div className="ea-account-status">
                    <span className={`ea-status-dot ${account.enabled ? 'active' : 'inactive'}`} />
                  </div>
                  <div className="ea-account-info">
                    <h3>{account.displayName || account.emailAddress}</h3>
                    <p className="ea-account-email">{account.emailAddress}</p>
                  </div>
                  <button
                    className={`ea-toggle-btn ${account.enabled ? 'enabled' : 'disabled'}`}
                    onClick={() => toggleEnabled(account)}
                    title={account.enabled ? 'Wyłącz konto' : 'Włącz konto'}
                  >
                    {account.enabled ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  </button>
                </div>

                <div className="ea-account-details">
                  <div className="ea-detail-row">
                    <div className="ea-detail-icon">
                      <Inbox size={16} />
                    </div>
                    <span className="ea-detail-label">IMAP:</span>
                    <span className="ea-detail-value">{account.imapHost}:{account.imapPort}</span>
                  </div>
                  <div className="ea-detail-row">
                    <div className="ea-detail-icon">
                      <Send size={16} />
                    </div>
                    <span className="ea-detail-label">SMTP:</span>
                    <span className="ea-detail-value">{account.smtpHost}:{account.smtpPort}</span>
                  </div>
                  <div className="ea-detail-row">
                    <div className="ea-detail-icon">
                      <Shield size={16} />
                    </div>
                    <span className="ea-detail-label">Protokół:</span>
                    <span className="ea-detail-value">{account.imapProtocol}</span>
                  </div>
                  {account.lastFetchAt && (
                    <div className="ea-detail-row">
                      <div className="ea-detail-icon">
                        <Clock size={16} />
                      </div>
                      <span className="ea-detail-label">Ostatnie pobranie:</span>
                      <span className="ea-detail-value">
                        {new Date(account.lastFetchAt).toLocaleString('pl-PL')}
                      </span>
                    </div>
                  )}
                  <div className="ea-detail-row">
                    <div className="ea-detail-icon">
                      <Mail size={16} />
                    </div>
                    <span className="ea-detail-label">Emaili:</span>
                    <span className="ea-detail-value ea-email-count">{account.emailCount || 0}</span>
                  </div>
                </div>

                <div className="ea-account-actions">
                  <button className="ea-action-btn edit" onClick={() => handleEdit(account)} title="Edytuj">
                    <Edit3 size={16} />
                    <span>Edytuj</span>
                  </button>
                  <button
                    className={`ea-action-btn toggle ${account.enabled ? 'pause' : 'play'}`}
                    onClick={() => toggleEnabled(account)}
                    title={account.enabled ? 'Dezaktywuj' : 'Aktywuj'}
                  >
                    <Power size={16} />
                    <span>{account.enabled ? 'Dezaktywuj' : 'Aktywuj'}</span>
                  </button>
                  <button className="ea-action-btn delete" onClick={() => handleDelete(account.id)} title="Usuń">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content ea-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAccount ? 'Edytuj konto email' : 'Dodaj konto email'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="ea-form">
              <div className="ea-form-section">
                <h3><Mail size={16} /> Podstawowe informacje</h3>
                
                <div className="form-group">
                  <label>Adres email *</label>
                  <input
                    type="email"
                    name="emailAddress"
                    value={formData.emailAddress}
                    onChange={handleInputChange}
                    required
                    placeholder="user@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Hasło {!editingAccount && '*'}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingAccount}
                    placeholder={editingAccount ? "Zostaw puste aby nie zmieniać" : "Hasło do konta email"}
                  />
                  {editingAccount && (
                    <small className="form-help">
                      Pozostaw puste jeśli nie chcesz zmieniać hasła
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label>Nazwa wyświetlana</label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="Moje konto firmowe"
                  />
                </div>
              </div>

              <div className="ea-form-section">
                <h3><Inbox size={16} /> Konfiguracja IMAP (odbieranie)</h3>
                <div className="ea-form-row">
                  <div className="form-group">
                    <label>Serwer IMAP *</label>
                    <input
                      type="text"
                      name="imapHost"
                      value={formData.imapHost}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Port IMAP *</label>
                    <input
                      type="number"
                      name="imapPort"
                      value={formData.imapPort}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Protokół IMAP</label>
                  <select
                    name="imapProtocol"
                    value={formData.imapProtocol}
                    onChange={handleInputChange}
                  >
                    <option value="imaps">IMAPS (SSL/TLS)</option>
                    <option value="imap">IMAP (bez szyfrowania)</option>
                  </select>
                </div>
              </div>

              <div className="ea-form-section">
                <h3><Send size={16} /> Konfiguracja SMTP (wysyłanie)</h3>
                <div className="ea-form-row">
                  <div className="form-group">
                    <label>Serwer SMTP *</label>
                    <input
                      type="text"
                      name="smtpHost"
                      value={formData.smtpHost}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Port SMTP *</label>
                    <input
                      type="number"
                      name="smtpPort"
                      value={formData.smtpPort}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="ea-form-section">
                <h3><Settings size={16} /> Stopka email (opcjonalnie)</h3>
                <div className="form-group">
                  <label>Stopka email z formatowaniem</label>
                  <SignatureEditor
                    value={formData.signature}
                    onChange={(html) => setFormData({ ...formData, signature: html })}
                  />
                  <small className="form-help">
                    Stopka będzie automatycznie dodawana do wszystkich wysyłanych emaili z tego konta.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label className="ea-checkbox-label">
                  <input
                    type="checkbox"
                    name="enabled"
                    checked={formData.enabled}
                    onChange={handleInputChange}
                  />
                  <span>Włączone (pobieraj emaile)</span>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAccount ? 'Zapisz zmiany' : 'Dodaj konto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailAccounts;
