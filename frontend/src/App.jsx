import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/Header';
import CommandPalette from './components/CommandPalette';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import Analytics from './pages/Analytics';
import Sequences from './pages/Sequences';
import Tasks from './pages/Tasks';
import CalendarTask from './pages/Calendar';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Deals from './pages/Deals';
import Users from './pages/Users';
import EmailAccounts from './pages/EmailAccounts';
import EmailTemplates from './pages/EmailTemplates';
import Automations from './pages/Automations';
import './App.css';

// Komponent ochrony tras - wymaga zalogowania
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const [currentSection, setCurrentSection] = useState('emails');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global keyboard shortcut for Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Toaster position="top-right" />
          <CommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <>
                    <Header
                      currentSection={currentSection}
                      setCurrentSection={setCurrentSection}
                      onOpenSearch={() => setCommandPaletteOpen(true)}
                    />
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/contacts" element={<Contacts />} />
                      <Route path="/campaigns" element={<Campaigns />} />
                      <Route path="/deals" element={<Deals />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/sequences" element={<Sequences />} />
                      <Route path="/tasks" element={<Tasks />} />
                      <Route path="/calendar" element={<CalendarTask />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/email-accounts" element={<EmailAccounts />} />
                      <Route path="/email-templates" element={<EmailTemplates />} />
                      <Route path="/automations" element={<Automations />} />
                    </Routes>
                  </>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
