import React, { useState, useEffect } from 'react';
import { contactsApi } from '../services/api';
import EmailModal from '../components/EmailModal';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactEmails, setContactEmails] = useState([]);
  const [showConversation, setShowConversation] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await contactsApi.getAll();
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncContactsFromEmails = async () => {
    if (!confirm('Czy chcesz zsynchronizować kontakty ze wszystkich emaili? Proces zostanie uruchomiony w tle.')) {
      return;
    }

    try {
      const response = await contactsApi.syncFromEmails();

      if (response.data.success) {
        alert(`✅ ${response.data.message}\n\nKontakty będą aktualizowane w tle. Możesz odświeżyć stronę za chwilę aby zobaczyć nowe kontakty.`);
        // Opcjonalnie odśwież po 5 sekundach
        setTimeout(() => {
          fetchContacts();
        }, 5000);
      } else {
        alert(`❌ Błąd: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error syncing contacts:', error);
      alert('❌ Nie udało się uruchomić synchronizacji: ' + (error.response?.data?.message || error.message));
    }
  };

  const viewConversation = async (contact) => {
    try {
      const response = await contactsApi.getContactEmails(contact.id);
      setSelectedContact(response.data.contact);
      setContactEmails(response.data.emails);
      setShowConversation(true);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      alert('Nie udało się pobrać konwersacji: ' + (error.response?.data?.message || error.message));
    }
  };

  const closeConversation = () => {
    setShowConversation(false);
    setSelectedContact(null);
    setContactEmails([]);
  };

  const deleteContact = async (contactId, contactName) => {
    if (!confirm(`Czy na pewno chcesz usunąć kontakt "${contactName}"?`)) {
      return;
    }
    
    try {
      await contactsApi.delete(contactId);
      alert(`✅ Kontakt "${contactName}" został usunięty`);
      fetchContacts(); // Odśwież listę
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('❌ Nie udało się usunąć kontaktu');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status) => {
    const labels = {
      positive: 'Pozytywna',
      neutral: 'Neutralna',
      negative: 'Negatywna'
    };
    return labels[status] || status;
  };

  const getInitials = (name) => {
    if (!name || name.trim().length === 0) {
      return '?';
    }
    const words = name.trim().split(/\s+/).filter(word => word.length > 0);
    if (words.length === 0) {
      return '?';
    }
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    // Weź pierwszą literę pierwszego i drugiego słowa
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const getRandomColor = () => {
    const colors = ['#007AFF', '#34C759', '#FF9500', '#5856D6', '#FF3B30', '#00C7BE'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className="container">
      {selectedEmail && (
        <EmailModal 
          email={selectedEmail} 
          onClose={() => setSelectedEmail(null)} 
        />
      )}
      {showConversation && selectedContact ? (
        // Widok konwersacji
        <div>
          <div className="page-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="page-title">Konwersacja z {selectedContact.name}</h1>
                <p className="page-subtitle">{selectedContact.email} • {selectedContact.company}</p>
              </div>
              <button className="btn btn-secondary" onClick={closeConversation}>
                ← Powrót do kontaktów
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Historia wiadomości ({contactEmails.length})</h2>
            </div>
            <div className="email-list">
              {contactEmails.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <p>Brak wiadomości z tym kontaktem</p>
                </div>
              ) : (
                contactEmails.map((email) => (
                  <div 
                    key={email.id} 
                    className="email-item"
                    onClick={() => setSelectedEmail(email)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="email-header">
                      <div>
                        <span className="email-sender">{email.sender}</span>
                        <span className="email-company">{email.company}</span>
                      </div>
                      <span className="email-time">{formatDate(email.receivedAt)}</span>
                    </div>
                    <div className="email-subject">{email.subject}</div>
                    <div className="email-preview">{email.preview}</div>
                    <div className="email-tags">
                      <span className={`tag ${email.status}`}>
                        {getStatusLabel(email.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        // Widok listy kontaktów
        <div>
          <div className="page-header">
            <h1 className="page-title">Kontakty biznesowe</h1>
            <p className="page-subtitle">Zarządzanie bazą kontaktów i relacjami z klientami</p>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Wszyscy kontakty ({contacts.length})</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={syncContactsFromEmails}
                  disabled={loading}
                >
                  🔄 Synchronizuj z emaili
                </button>
                <button className="btn btn-primary" onClick={() => alert('Funkcja dodawania kontaktu')}>
                  <span>+</span> Dodaj kontakt
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                Ładowanie kontaktów...
              </div>
            ) : (
              <div className="contacts-grid">
                {contacts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <p>Brak kontaktów. Kontakty są tworzone automatycznie z maili!</p>
                  </div>
                ) : (
                  contacts.map((contact) => {
                    const initials = getInitials(contact.name);
                    const color = getRandomColor();

                    return (
                      <div key={contact.id} className="contact-card">
                        <div className="contact-header">
                          <div 
                            className="contact-avatar" 
                            style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
                          >
                            {initials}
                          </div>
                          <div className="contact-info" style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>{contact.name}</h3>
                            <p style={{ margin: 0 }}>{contact.company}</p>
                          </div>
                        </div>
                        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem', marginTop: 0 }}>
                          {contact.email}
                        </p>
                        {contact.position && (
                          <p style={{ color: '#007AFF', fontSize: '0.85rem', marginBottom: '0.5rem', marginTop: 0, fontWeight: '500' }}>
                            {contact.position}
                          </p>
                        )}
                        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem', marginTop: 0 }}>
                          {contact.phone || 'Brak telefonu'}
                        </p>
                        <div className="contact-stats">
                          <div className="stat">
                            <div className="stat-number-small">{contact.emailCount}</div>
                            <div className="stat-label-small">Maile</div>
                          </div>
                          <div className="stat">
                            <div className="stat-number-small">{contact.meetingCount}</div>
                            <div className="stat-label-small">Spotkania</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1 }}
                            onClick={() => viewConversation(contact)}
                          >
                            📧 Zobacz konwersację
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.5rem', minWidth: 'auto' }}
                            onClick={() => deleteContact(contact.id, contact.name)}
                            title="Usuń kontakt"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
