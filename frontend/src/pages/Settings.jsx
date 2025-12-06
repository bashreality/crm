import React, { useState } from 'react';
import axios from 'axios';
import {
  Settings as SettingsIcon,
  Lock,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  User,
  Key
} from 'lucide-react';
import '../styles/Settings.css';

const Settings = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{"username": "admin"}');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <div className="settings-container">
      {/* Page Header */}
      <div className="settings-page-header">
        <div className="settings-header-content">
          <div className="settings-header-icon">
            <SettingsIcon size={32} />
          </div>
          <div>
            <h1>Ustawienia</h1>
            <p>Zarządzaj ustawieniami konta i bezpieczeństwem</p>
          </div>
        </div>
      </div>

      {/* Stats/Info Cards */}
      <div className="settings-stats-grid">
        <div className="settings-stat-card">
          <div className="settings-stat-icon user">
            <User size={24} />
          </div>
          <div className="settings-stat-content">
            <div className="settings-stat-value">{user.username}</div>
            <div className="settings-stat-label">Zalogowany użytkownik</div>
          </div>
        </div>
        <div className="settings-stat-card">
          <div className="settings-stat-icon security">
            <Shield size={24} />
          </div>
          <div className="settings-stat-content">
            <div className="settings-stat-value">Aktywne</div>
            <div className="settings-stat-label">Status konta</div>
          </div>
        </div>
        <div className="settings-stat-card warning">
          <div className="settings-stat-icon warning">
            <AlertTriangle size={24} />
          </div>
          <div className="settings-stat-content">
            <div className="settings-stat-value">Ważne</div>
            <div className="settings-stat-label">Zmień domyślne hasło</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="settings-content">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Lock size={20} />
            </div>
            <div>
              <h2>Zmiana hasła</h2>
              <p>Zaktualizuj hasło do swojego konta</p>
            </div>
          </div>

          <form className="settings-form" onSubmit={handleSubmit}>
            <div className="settings-form-group">
              <label htmlFor="currentPassword">
                <Key size={16} />
                Aktualne hasło
              </label>
              <div className="settings-input-wrapper">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Wprowadź obecne hasło"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="settings-toggle-password"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="settings-form-group">
              <label htmlFor="newPassword">
                <Lock size={16} />
                Nowe hasło
              </label>
              <div className="settings-input-wrapper">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 znaków"
                  required
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  className="settings-toggle-password"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="settings-input-hint">Hasło powinno mieć min. 8 znaków oraz zawierać litery i cyfry</span>
            </div>

            <div className="settings-form-group">
              <label htmlFor="confirmPassword">
                <Lock size={16} />
                Potwierdź nowe hasło
              </label>
              <div className="settings-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Powtórz nowe hasło"
                  required
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  className="settings-toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {status.message && (
              <div className={`settings-status-message ${status.type}`}>
                {status.type === 'success' ? <Shield size={18} /> : <AlertTriangle size={18} />}
                {status.message}
              </div>
            )}

            <div className="settings-form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={18} />
                {loading ? 'Zapisywanie...' : 'Zapisz nowe hasło'}
              </button>
            </div>
          </form>
        </div>

        {/* Security Notice */}
        <div className="settings-notice">
          <div className="settings-notice-icon">
            <Shield size={24} />
          </div>
          <div className="settings-notice-content">
            <h3>Wskazówki bezpieczeństwa</h3>
            <ul>
              <li>Używaj unikalnego hasła dla każdego konta</li>
              <li>Nie udostępniaj swojego hasła innym osobom</li>
              <li>Regularnie zmieniaj hasło (co 3-6 miesięcy)</li>
              <li>Używaj kombinacji liter, cyfr i znaków specjalnych</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
