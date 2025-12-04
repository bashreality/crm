import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
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

  if (loading) {
    return <div className="loading">Ładowanie kont email...</div>;
  }

  return (
    <div className="email-accounts-container">
      <div className="accounts-header">
        <h1>Zarządzanie kontami email</h1>
      </div>

      <div className="accounts-grid">
        {accounts.map(account => (
          <div key={account.id} className="account-card">
            <div className="account-header">
              <div className="account-title">
                <h3>{account.displayName || account.emailAddress}</h3>
                <p className="account-email">{account.emailAddress}</p>
              </div>
              <button
                className={`toggle-enabled ${account.enabled ? 'enabled' : 'disabled'}`}
                onClick={() => toggleEnabled(account)}
                title={account.enabled ? 'Wyłącz konto' : 'Włącz konto'}
              >
                {account.enabled ? '✓' : '✗'}
              </button>
            </div>

            <div className="account-info">
              <div className="info-row">
                <span className="label">IMAP:</span>
                <span className="value">{account.imapHost}:{account.imapPort}</span>
              </div>
              <div className="info-row">
                <span className="label">SMTP:</span>
                <span className="value">{account.smtpHost}:{account.smtpPort}</span>
              </div>
              <div className="info-row">
                <span className="label">Protokół:</span>
                <span className="value">{account.imapProtocol}</span>
              </div>
              {account.lastFetchAt && (
                <div className="info-row">
                  <span className="label">Ostatnie pobranie:</span>
                  <span className="value">
                    {new Date(account.lastFetchAt).toLocaleString('pl-PL')}
                  </span>
                </div>
              )}
              <div className="info-row">
                <span className="label">Liczba emaili:</span>
                <span className="value">{account.emailCount || 0}</span>
              </div>
            </div>

            <div className="account-actions">
              <button className="btn-edit" onClick={() => handleEdit(account)}>
                Edytuj
              </button>
              <button className="btn-toggle" onClick={() => toggleEnabled(account)}>
                {account.enabled ? 'Dezaktywuj' : 'Aktywuj'}
              </button>
              <button className="btn-delete" onClick={() => handleDelete(account.id)}>
                Usuń
              </button>
            </div>
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="no-accounts">
            <p>Brak kont email. Dodaj pierwsze konto aby rozpocząć.</p>
            <button className="btn-add" onClick={() => setShowModal(true)}>
              + Dodaj konto email
            </button>
          </div>
        )}
        {accounts.length > 0 && (
          <div className="add-account-section">
            <button className="btn-add" onClick={() => setShowModal(true)}>
              + Dodaj kolejne konto email
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingAccount ? 'Edytuj konto email' : 'Dodaj konto email'}</h2>

            <form onSubmit={handleSubmit}>
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

              <div className="form-section">
                <h3>Konfiguracja IMAP (odbieranie emaili)</h3>
                <div className="form-row">
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

              <div className="form-section">
                <h3>Konfiguracja SMTP (wysyłanie emaili)</h3>
                <div className="form-row">
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

              <div className="form-section">
                <h3>Stopka email HTML (opcjonalnie)</h3>
                <div className="form-group">
                  <label>Stopka email z formatowaniem</label>
                  <SignatureEditor
                    value={formData.signature}
                    onChange={(html) => setFormData({ ...formData, signature: html })}
                  />
                  <small className="form-help">
                    Stopka będzie automatycznie dodawana do wszystkich wysyłanych emaili z tego konta.
                    Możesz formatować tekst, dodawać kolory, linki i obrazy.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="enabled"
                    checked={formData.enabled}
                    onChange={handleInputChange}
                  />
                  <span>Włączone (pobieraj emaile)</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Anuluj
                </button>
                <button type="submit" className="btn-save">
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
