import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, Bell, Check, Trash2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api, { notificationsApi } from '../services/api';

const Header = ({ onOpenSearch }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const { theme, toggleTheme } = useTheme();
  
  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

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
    
    // Pobierz powiadomienia
    fetchNotifications();
    
    // Odświeżaj powiadomienia co 30 sekund
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Zamknij dropdown przy kliknięciu poza nim
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.getAll(20),
        notificationsApi.getUnreadCount()
      ]);
      setNotifications(notifRes.data || []);
      setUnreadCount(countRes.data?.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await notificationsApi.delete(id);
      const deleted = notifications.find(n => n.id === id);
      setNotifications(notifications.filter(n => n.id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'przed chwilą';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min temu`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} godz. temu`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} dni temu`;
    return date.toLocaleDateString('pl-PL');
  };

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

          {/* Notifications Bell */}
          <div className="notification-wrapper" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="notification-button"
              title="Powiadomienia"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Powiadomienia</h3>
                  {unreadCount > 0 && (
                    <button 
                      className="mark-all-read-btn"
                      onClick={handleMarkAllAsRead}
                      title="Oznacz wszystkie jako przeczytane"
                    >
                      <Check size={14} /> Przeczytaj wszystkie
                    </button>
                  )}
                </div>
                
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      <Bell size={32} />
                      <p>Brak powiadomień</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                      >
                        <div className="notification-content">
                          <div className="notification-title">{notification.title}</div>
                          <div className="notification-message">
                            {notification.message?.split('\n')[0]}
                          </div>
                          <div className="notification-time">
                            {formatTimeAgo(notification.createdAt)}
                          </div>
                        </div>
                        <div className="notification-actions">
                          {!notification.isRead && (
                            <button 
                              onClick={() => handleMarkAsRead(notification.id)}
                              title="Oznacz jako przeczytane"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteNotification(notification.id)}
                            title="Usuń"
                            className="delete-btn"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
