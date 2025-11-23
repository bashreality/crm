import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import Analytics from './pages/Analytics';
import Sequences from './pages/Sequences';
import Tasks from './pages/Tasks';
import CalendarTask from './pages/Calendar';
import Login from './pages/Login';
import Settings from './pages/Settings';
import './App.css';

// Komponent ochrony tras - wymaga zalogowania
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const [currentSection, setCurrentSection] = useState('emails');

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <>
                  <Header currentSection={currentSection} setCurrentSection={setCurrentSection} />
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/campaigns" element={<Campaigns />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/sequences" element={<Sequences />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/calendar" element={<CalendarTask />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
