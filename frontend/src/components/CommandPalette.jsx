import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Users, 
  Mail, 
  Briefcase, 
  Calendar, 
  Settings,
  BarChart3,
  Zap,
  User,
  Building2,
  X
} from 'lucide-react';
import { contactsApi } from '../services/api';
import api from '../services/api';

const CommandPalette = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Navigation shortcuts
  const navigationItems = [
    { type: 'nav', icon: <Mail size={18} />, title: 'Skrzynka odbiorcza', path: '/', keywords: 'inbox email dashboard skrzynka' },
    { type: 'nav', icon: <Users size={18} />, title: 'Kontakty', path: '/contacts', keywords: 'contacts kontakty ludzie osoby' },
    { type: 'nav', icon: <Briefcase size={18} />, title: 'Szanse sprzedażowe', path: '/deals', keywords: 'deals szanse pipeline lejek sprzedaz' },
    { type: 'nav', icon: <Calendar size={18} />, title: 'Zadania', path: '/tasks', keywords: 'tasks zadania todo lista' },
    { type: 'nav', icon: <Zap size={18} />, title: 'Sekwencje', path: '/sequences', keywords: 'sequences sekwencje kampanie drip' },
    { type: 'nav', icon: <BarChart3 size={18} />, title: 'Analityka', path: '/analytics', keywords: 'analytics analityka raporty statystyki' },
    { type: 'nav', icon: <Settings size={18} />, title: 'Ustawienia', path: '/settings', keywords: 'settings ustawienia konfiguracja' },
  ];

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search function
  const searchContacts = useCallback(async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [contactsRes, dealsRes] = await Promise.all([
        contactsApi.getAll({ showAll: true }),
        api.get('/deals/pipelines')
      ]);

      const contacts = contactsRes.data || [];
      const pipelines = dealsRes.data || [];
      const deals = pipelines.flatMap(p => p.deals || []);

      const queryLower = searchQuery.toLowerCase();

      // Filter contacts
      const matchedContacts = contacts
        .filter(c => 
          c.name?.toLowerCase().includes(queryLower) ||
          c.email?.toLowerCase().includes(queryLower) ||
          c.company?.toLowerCase().includes(queryLower)
        )
        .slice(0, 5)
        .map(c => ({
          type: 'contact',
          icon: <User size={18} />,
          title: c.name,
          subtitle: `${c.email} • ${c.company || 'Brak firmy'}`,
          data: c
        }));

      // Filter navigation items
      const matchedNav = navigationItems.filter(item =>
        item.title.toLowerCase().includes(queryLower) ||
        item.keywords.toLowerCase().includes(queryLower)
      );

      setResults([...matchedNav, ...matchedContacts]);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        searchContacts(query);
      } else {
        // Show navigation items when no query
        setResults(navigationItems.slice(0, 5));
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, searchContacts]);

  // Handle selection
  const handleSelect = (item) => {
    if (item.type === 'nav') {
      navigate(item.path);
    } else if (item.type === 'contact') {
      navigate('/contacts', { state: { selectedContactId: item.data.id } });
    }
    onClose();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, results.length]);

  if (!isOpen) return null;

  return (
    <div 
      className="command-palette-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 9999
      }}
    >
      <div 
        className="command-palette"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '600px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'slideDown 0.2s ease-out'
        }}
      >
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          gap: '12px'
        }}>
          <Search size={20} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Szukaj kontaktów, stron, akcji..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              backgroundColor: 'transparent'
            }}
          />
          <kbd style={{
            padding: '4px 8px',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#6b7280',
            border: '1px solid #e5e7eb'
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div 
          ref={resultsRef}
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '8px'
          }}
        >
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
              Szukam...
            </div>
          ) : results.length === 0 && query ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
              Brak wyników dla "{query}"
            </div>
          ) : (
            results.map((item, index) => (
              <div
                key={`${item.type}-${index}`}
                onClick={() => handleSelect(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  backgroundColor: selectedIndex === index ? '#f3f4f6' : 'transparent',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: item.type === 'contact' ? '#dbeafe' : '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.type === 'contact' ? '#3b82f6' : '#6b7280'
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px', color: '#111827' }}>
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {item.subtitle}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {item.type === 'nav' ? 'Przejdź' : 'Otwórz'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '16px',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          <span>↑↓ nawigacja</span>
          <span>↵ wybierz</span>
          <span>ESC zamknij</span>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CommandPalette;




