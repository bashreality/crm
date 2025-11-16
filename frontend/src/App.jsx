import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import Analytics from './pages/Analytics';
import Sequences from './pages/Sequences';
import Tasks from './pages/Tasks';
import './App.css';

function App() {
  const [currentSection, setCurrentSection] = useState('emails');

  return (
    <Router>
      <div className="App">
        <Header currentSection={currentSection} setCurrentSection={setCurrentSection} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/sequences" element={<Sequences />} />
          <Route path="/tasks" element={<Tasks />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
