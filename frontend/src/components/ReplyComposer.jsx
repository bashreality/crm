import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ReplyComposer = ({ email, onClose, onSent }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Ustaw domyślny temat jako "Re: ..."
    if (email && email.subject) {
      const reSubject = email.subject.startsWith('Re: ')
        ? email.subject
        : `Re: ${email.subject}`;
      setSubject(reSubject);
    }
  }, [email]);

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.post(`/emails/${email.id}/suggest-reply`);
      setBody(response.data.suggestion);
    } catch (err) {
      console.error('Error generating AI suggestion:', err);
      setError('Nie udało się wygenerować sugestii AI. Spróbuj ponownie.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Temat i treść nie mogą być puste');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post(`/emails/${email.id}/reply`, {
        subject: subject.trim(),
        body: body.trim()
      });

      setSuccess(true);

      // Zamknij po 1.5 sekundy
      setTimeout(() => {
        onSent && onSent();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error sending reply:', err);
      setError('Nie udało się wysłać odpowiedzi. Spróbuj ponownie.');
      setIsLoading(false);
    }
  };

  if (!email) return null;

  const handleOverlayClick = (event) => {
    event.stopPropagation();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: '2rem',
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden'
      }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '2px solid #f0f0f0',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.75rem' }}>✉️</span>
              Odpowiedz na email
            </h2>
            <button
              onClick={onClose}
              disabled={isLoading}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'white',
                padding: '0.5rem',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (!isLoading) e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              ✕
            </button>
          </div>
          <div style={{
            marginTop: '1rem',
            fontSize: '0.9rem',
            opacity: 0.95
          }}>
            <div><strong>Do:</strong> {email.sender}</div>
          </div>
        </div>

        {/* Form */}
        <div style={{
          padding: '2rem',
          flex: 1,
          overflowY: 'auto'
        }}>
          {/* Subject */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#333',
              fontSize: '0.95rem'
            }}>
              Temat
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isLoading}
              placeholder="Re: ..."
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.2s',
                backgroundColor: isLoading ? '#f9f9f9' : 'white'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* AI Suggestion Button */}
          <div style={{
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <label style={{
              fontWeight: '600',
              color: '#333',
              fontSize: '0.95rem'
            }}>
              Treść wiadomości
            </label>
            <button
              onClick={handleGenerateAI}
              disabled={isGenerating || isLoading}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '0.625rem 1.25rem',
                borderRadius: '10px',
                cursor: isGenerating || isLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                opacity: isGenerating || isLoading ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}
              onMouseOver={(e) => {
                if (!isGenerating && !isLoading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }}
            >
              {isGenerating ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite'
                  }}>⚙️</span>
                  Generuję...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Wygeneruj AI
                </>
              )}
            </button>
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isLoading}
            placeholder="Wpisz swoją odpowiedź lub użyj AI do wygenerowania sugestii..."
            style={{
              width: '100%',
              minHeight: '250px',
              padding: '1rem',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              fontSize: '1rem',
              lineHeight: '1.6',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              backgroundColor: isLoading ? '#f9f9f9' : 'white'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e0e0e0';
              e.target.style.boxShadow = 'none';
            }}
          />

          {/* Error Message */}
          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '10px',
              fontSize: '0.9rem',
              border: '1px solid #fcc'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#efe',
              color: '#3c3',
              borderRadius: '10px',
              fontSize: '0.9rem',
              border: '1px solid #cfc'
            }}>
              ✓ Odpowiedź wysłana pomyślnie!
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem 2rem',
          borderTop: '2px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem',
          backgroundColor: '#fafafa'
        }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '0.875rem 1.75rem',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              backgroundColor: 'white',
              color: '#666',
              transition: 'all 0.2s',
              opacity: isLoading ? 0.6 : 1
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = '#f5f5f5';
                e.target.style.borderColor = '#d0d0d0';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#e0e0e0';
            }}
          >
            Anuluj
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !subject.trim() || !body.trim()}
            style={{
              padding: '0.875rem 2rem',
              border: 'none',
              borderRadius: '12px',
              cursor: (isLoading || !subject.trim() || !body.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              transition: 'all 0.2s',
              opacity: (isLoading || !subject.trim() || !body.trim()) ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => {
              if (!isLoading && subject.trim() && body.trim()) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
          >
            {isLoading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite'
                }}>⚙️</span>
                Wysyłanie...
              </>
            ) : (
              <>
                <span>📤</span>
                Wyślij odpowiedź
              </>
            )}
          </button>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ReplyComposer;
