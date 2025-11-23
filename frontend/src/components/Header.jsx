import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    // Wyczyść dane z localStorage
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');

    // Przekieruj na stronę logowania
    navigate('/login');
  };

  // Pobierz dane użytkownika z localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{"username": "admin"}');

  return (
    <header className="header">
      <div className="header-content">
        <div className="nav">
          <div className="logo">CRM System</div>
          <Link
            to="/"
            className={`nav-item ${isActive('/') ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            to="/contacts"
            className={`nav-item ${isActive('/contacts') ? 'active' : ''}`}
          >
            Kontakty
          </Link>
          <Link
            to="/campaigns"
            className={`nav-item ${isActive('/campaigns') ? 'active' : ''}`}
          >
            Kampanie
          </Link>
          <Link
            to="/sequences"
            className={`nav-item ${isActive('/sequences') ? 'active' : ''}`}
          >
            Sekwencje
          </Link>
          <Link
            to="/tasks"
            className={`nav-item ${isActive('/tasks') ? 'active' : ''}`}
          >
            Zadania
          </Link>
          <Link
            to="/calendar"
            className={`nav-item ${isActive('/calendar') ? 'active' : ''}`}
          >
            Kalendarz
          </Link>
          <Link
            to="/analytics"
            className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}
          >
            Analityka
          </Link>
          <Link
            to="/settings"
            className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
          >
            Ustawienia
          </Link>
        </div>
        <div className="user-info">
          <span>{user.username}</span>
          <div className="avatar">{user.username.substring(0, 2).toUpperCase()}</div>
          <button onClick={handleLogout} className="logout-btn" title="Wyloguj się">
            🚪 Wyloguj
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
