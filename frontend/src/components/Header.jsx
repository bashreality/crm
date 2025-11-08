import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

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
            to="/analytics" 
            className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}
          >
            Analityka
          </Link>
        </div>
        <div className="user-info">
          <span>Jan Kowalski</span>
          <div className="avatar">JK</div>
        </div>
      </div>
    </header>
  );
};

export default Header;
