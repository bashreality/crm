import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      if (response.data.accessToken) {
        // Zapisz token i informacje o użytkowniku
        localStorage.setItem('token', response.data.accessToken);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify({
          username: response.data.username,
          role: response.data.role
        }));
        
        // Skonfiguruj domyślny nagłówek dla przyszłych zapytań (opcjonalnie, bo interceptor to robi)
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;

        // Przekieruj do dashboardu
        navigate('/');
      } else {
        setError('Nie udało się pobrać tokena logowania');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Nieprawidłowa nazwa użytkownika lub hasło');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">CRM System</h1>
        <p className="login-subtitle">Zaloguj się do systemu</p>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Nazwa użytkownika</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Hasło</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <div className="login-hint">
          <p>Domyślne dane logowania:</p>
          <p><strong>Login:</strong> admin | <strong>Hasło:</strong> admin123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
