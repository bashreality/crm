import React from 'react';

const Settings = () => {
  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ustawienia systemu</h1>
        <p className="page-subtitle">Konfiguracja CRM i parametrów użytkownika</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Ustawienia email</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div className="filter-group">
            <label>Serwer SMTP</label>
            <input type="text" className="filter-input" placeholder="smtp.gmail.com" defaultValue="smtp.company.com" />
          </div>
          <div className="filter-group">
            <label>Port</label>
            <input type="text" className="filter-input" placeholder="587" defaultValue="587" />
          </div>
          <div className="filter-group">
            <label>Email nadawcy</label>
            <input type="email" className="filter-input" placeholder="crm@company.com" defaultValue="crm@twoja-firma.pl" />
          </div>
          <div className="filter-group">
            <label>Nazwa nadawcy</label>
            <input type="text" className="filter-input" placeholder="CRM System" defaultValue="Twoja Firma CRM" />
          </div>
          <button className="btn btn-primary">Zapisz ustawienia</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h2 className="card-title">Automatyzacja</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div className="filter-group">
            <label>
              <input type="checkbox" defaultChecked style={{ marginRight: '0.5rem' }} />
              Automatyczna klasyfikacja emaili
            </label>
          </div>
          <div className="filter-group">
            <label>
              <input type="checkbox" defaultChecked style={{ marginRight: '0.5rem' }} />
              Powiadomienia o nowych leadach
            </label>
          </div>
          <div className="filter-group">
            <label>
              <input type="checkbox" style={{ marginRight: '0.5rem' }} />
              Auto-odpowiadanie
            </label>
          </div>
          <div className="filter-group">
            <label>
              <input type="checkbox" defaultChecked style={{ marginRight: '0.5rem' }} />
              Backup codziennych danych
            </label>
          </div>
          <button className="btn btn-primary">Zapisz ustawienia</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h2 className="card-title">Informacje systemu</h2>
        </div>
        <div style={{ padding: '1.5rem', fontSize: '0.9rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#666' }}>Wersja:</div>
            <div style={{ fontWeight: 600 }}>CRM v1.0.0</div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#666' }}>Backend:</div>
            <div style={{ fontWeight: 600 }}>Spring Boot 3.2.0</div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#666' }}>Frontend:</div>
            <div style={{ fontWeight: 600 }}>React 18.2.0</div>
          </div>
          <div>
            <div style={{ color: '#666' }}>Baza danych:</div>
            <div style={{ fontWeight: 600 }}>PostgreSQL 15</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
