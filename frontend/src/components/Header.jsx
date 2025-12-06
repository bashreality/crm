import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const Header = ({ onOpenSearch }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const { theme, toggleTheme } = useTheme();

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    // Pobierz informacje o aktualnym użytkowniku
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get('/users/me');
        setCurrentUser(response.data);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const handleLogout = () => {
    // Wyczyść dane z localStorage
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // Przekieruj na stronę logowania
    navigate('/login');
  };

  // Pobierz dane użytkownika z localStorage jako fallback
  const user = JSON.parse(localStorage.getItem('user') || '{"username": "admin"}');
  const isAdmin = currentUser?.role === 'ADMIN';

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
            to="/deals"
            className={`nav-item ${isActive('/deals') ? 'active' : ''}`}
          >
            Szanse
          </Link>
          <Link
            to="/email-marketing"
            className={`nav-item ${isActive('/email-marketing') ? 'active' : ''}`}
          >
            Marketing
          </Link>
          <Link
            to="/sequences"
            className={`nav-item ${isActive('/sequences') ? 'active' : ''}`}
          >
            Sekwencje
          </Link>
          <Link
            to="/automations"
            className={`nav-item ${isActive('/automations') ? 'active' : ''}`}
          >
            Automatyzacje
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
          {isAdmin && (
            <Link
              to="/users"
              className={`nav-item ${isActive('/users') ? 'active' : ''}`}
            >
              Użytkownicy
            </Link>
          )}
          <Link
            to="/email-accounts"
            className={`nav-item ${isActive('/email-accounts') ? 'active' : ''}`}
          >
            Konta
          </Link>
        </div>
        
        <div className="header-right-section">
          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            className="search-button"
            title="Szukaj (Ctrl+K)"
          >
            <Search size={16} />
            <span className="search-text">Szukaj...</span>
            <kbd className="search-kbd">⌘K</kbd>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-button"
            title={theme === 'dark' ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Info */}
          <div className="user-info">
            <button
              className="avatar avatar-button"
              title="Konto i zmiana hasła"
              onClick={() => navigate('/settings')}
            >
              {user.username.substring(0, 2).toUpperCase()}
            </button>
            <div className="user-dropdown">
              <div className="user-name">{user.username}</div>
              <button onClick={handleLogout} className="logout-btn" title="Wyloguj się">
                🚪 Wyloguj
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
