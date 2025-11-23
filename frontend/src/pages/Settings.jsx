import React, { useState } from 'react';
import axios from 'axios';
import '../styles/Settings.css';

const Settings = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{"username": "admin"}');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Nowe hasło i potwierdzenie muszą być takie same.' });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/change-password', {
        username: user.username,
        currentPassword,
        newPassword,
        confirmPassword
      });

      setStatus({ type: 'success', message: response.data.message || 'Hasło zostało zmienione.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message = error.response?.data?.message || 'Nie udało się zmienić hasła.';
      setStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="settings-header">
        <div>
          <h1 className="page-title">Ustawienia konta</h1>
          <p className="page-subtitle">
            Zmień domyślne hasło administratora, aby zabezpieczyć dostęp do systemu.
          </p>
        </div>
        <div className="settings-hint">
          <span className="hint-dot" />
          <div>
            <strong>Uwaga bezpieczeństwa</strong>
            <p>Domyślne hasło to „admin123”. Zmień je po pierwszym logowaniu.</p>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h2>Zmiana hasła</h2>
        <form className="password-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="currentPassword">Aktualne hasło</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Obecne hasło"
              required
              disabled={loading}
            />
          </div>
          <div className="form-row">
            <label htmlFor="newPassword">Nowe hasło</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 znaków"
              required
              disabled={loading}
              minLength={8}
            />
          </div>
          <div className="form-row">
            <label htmlFor="confirmPassword">Potwierdź nowe hasło</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Powtórz nowe hasło"
              required
              disabled={loading}
              minLength={8}
            />
          </div>

          {status.message && (
            <div className={`status-message ${status.type}`}>
              {status.message}
            </div>
          )}

          <div className="actions">
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Zapisywanie...' : 'Zapisz nowe hasło'}
            </button>
            <p className="hint">
              Hasło powinno mieć min. 8 znaków oraz zawierać litery i cyfry.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
