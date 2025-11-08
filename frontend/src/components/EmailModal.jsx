import React from 'react';

const EmailModal = ({ email, onClose }) => {
  if (!email) return null;

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

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '2rem',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              marginBottom: '0.5rem'
            }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600',
                margin: 0
              }}>
                {email.subject}
              </h2>
              <span className={`tag ${email.status}`}>
                {getStatusLabel(email.status)}
              </span>
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>
              <div style={{ marginBottom: '0.25rem' }}>
                <strong>Od:</strong> {email.sender}
              </div>
              <div style={{ marginBottom: '0.25rem' }}>
                <strong>Firma:</strong> {email.company}
              </div>
              <div>
                <strong>Data:</strong> {formatDate(email.receivedAt)}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: '0.5rem',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#f0f0f0';
              e.target.style.color = '#333';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#666';
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '2rem',
          lineHeight: '1.8',
          fontSize: '1rem',
          color: '#333',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {email.content || email.preview || 'Brak treści wiadomości'}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem'
        }}>
          <button 
            className="btn btn-secondary"
            onClick={onClose}
          >
            Zamknij
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              // Tutaj możesz dodać akcję odpowiedzi
              alert('Funkcja odpowiedzi wkrótce!');
            }}
          >
            📧 Odpowiedz
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
