import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AttachmentUploader from './AttachmentUploader';
import RichTextEditor from './RichTextEditor';
import './RichTextEditor.css';

const EmailModal = ({ email, onClose, onEmailUpdated }) => {
  // Reply form state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (email && email.subject) {
      const reSubject = email.subject.startsWith('Re: ')
        ? email.subject
        : `Re: ${email.subject}`;
      setSubject(reSubject);
    }
  }, [email]);

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

  const getStatusColor = (status) => {
    const colors = {
      positive: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      neutral: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      negative: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }
    };
    return colors[status] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
  };

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
      const attachmentIds = attachments.map(a => a.id);
      await api.post(`/emails/${email.id}/reply`, {
        subject: subject.trim(),
        body: body.trim(),
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined
      });

      setSuccess(true);

      setTimeout(() => {
        if (onEmailUpdated) {
          onEmailUpdated();
        }
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error sending reply:', err);
      setError('Nie udało się wysłać odpowiedzi. Spróbuj ponownie.');
      setIsLoading(false);
    }
  };

  const statusColors = getStatusColor(email.status);

  return (
    <div
      className="modal-overlay email-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--color-bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="email-modal-container"
        style={{
          maxWidth: '1600px',
          width: '100%',
          height: '92vh',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT PANEL - Email Viewer (Clean, Flat) */}
        <div className="email-modal-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Email Header */}
          <div style={{
            padding: '1.75rem 2rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  flexWrap: 'wrap'
                }}>
                  <h2 style={{
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    margin: 0,
                    color: 'var(--color-text-main)',
                    lineHeight: 1.3,
                    letterSpacing: '-0.02em'
                  }}>
                    {email.subject}
                  </h2>
                  <span style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: statusColors.bg,
                    color: statusColors.text,
                    border: `1px solid ${statusColors.border}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {getStatusLabel(email.status)}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="btn-icon"
                style={{
                  background: 'var(--color-bg-main)',
                  border: '1px solid var(--color-border)',
                  fontSize: '1.125rem',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  padding: '0.5rem',
                  borderRadius: '10px',
                  transition: 'all 0.2s',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>

            {/* Sender Info Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem'
            }}>
              <div style={{
                background: 'var(--color-bg-main)',
                borderRadius: '12px',
                padding: '0.875rem 1rem',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.35rem'
                }}>Od</div>
                <div style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-text-main)',
                  fontWeight: '500',
                  wordBreak: 'break-word'
                }}>{email.sender}</div>
              </div>
              <div style={{
                background: 'var(--color-bg-main)',
                borderRadius: '12px',
                padding: '0.875rem 1rem',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.35rem'
                }}>Firma</div>
                <div style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-text-main)',
                  fontWeight: '500'
                }}>{email.company || '—'}</div>
              </div>
              <div style={{
                background: 'var(--color-bg-main)',
                borderRadius: '12px',
                padding: '0.875rem 1rem',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.35rem'
                }}>Data</div>
                <div style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-text-main)',
                  fontWeight: '500'
                }}>{formatDate(email.receivedAt)}</div>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.75rem 2rem',
            background: 'var(--color-bg-main)'
          }}>
            <div style={{
              background: 'var(--color-bg-surface)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--color-border)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
            }}>
              {/* Sprawdź czy treść zawiera HTML */}
              {(email.content || email.preview || '').includes('<') ? (
                <div
                  className="email-html-content"
                  style={{
                    lineHeight: '1.75',
                    fontSize: '0.95rem',
                    color: 'var(--color-text-main)',
                    wordBreak: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: (email.content || email.preview || 'Brak treści wiadomości')
                      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                      .replace(/on\w+="[^"]*"/gi, '')
                      .replace(/on\w+='[^']*'/gi, '')
                      .replace(/javascript:/gi, '')
                  }}
                />
              ) : (
                <div style={{
                  lineHeight: '1.85',
                  fontSize: '0.95rem',
                  color: 'var(--color-text-main)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {email.content || email.preview || 'Brak treści wiadomości'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Reply Composer (Floating Card) */}
        <div className="email-modal-panel email-reply-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06)',
          transform: 'translateY(0)',
          transition: 'all 0.3s ease'
        }}>
          {/* Reply Header */}
          <div style={{
            padding: '1.5rem 1.75rem',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #059669 100%)',
            color: 'white',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem'
              }}>
                ✉️
              </div>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  letterSpacing: '-0.01em'
                }}>
                  Odpowiedź
                </h3>
                <div style={{
                  fontSize: '0.8rem',
                  opacity: 0.9,
                  marginTop: '0.15rem'
                }}>
                  Do: {email.sender?.split('<')[0]?.trim() || email.sender}
                </div>
              </div>
            </div>
          </div>

          {/* Reply Form */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            background: 'var(--color-bg-main)'
          }}>
            {/* Subject Field */}
            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: 'var(--color-text-main)',
                fontSize: '0.85rem'
              }}>
                Temat
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isLoading}
                placeholder="Re: ..."
                className="email-modal-input"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid var(--color-border)',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-main)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Message Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <label style={{
                  fontWeight: '600',
                  color: 'var(--color-text-main)',
                  fontSize: '0.85rem'
                }}>
                  Treść wiadomości
                </label>
                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating || isLoading}
                  className="btn btn-secondary"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: isGenerating || isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s',
                    opacity: isGenerating || isLoading ? 0.6 : 1,
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
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
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Wpisz swoją odpowiedź lub użyj AI do wygenerowania sugestii..."
                minHeight="180px"
                disabled={isLoading}
              />
            </div>

            {/* Attachments */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: 'var(--color-text-main)',
                fontSize: '0.85rem'
              }}>
                Załączniki
              </label>
              <AttachmentUploader
                attachments={attachments}
                onChange={setAttachments}
                disabled={isLoading}
                maxSize={25}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="email-modal-alert email-modal-alert-error" style={{
                padding: '0.875rem 1rem',
                backgroundColor: 'var(--color-error-bg, #fef2f2)',
                color: 'var(--color-error, #dc2626)',
                borderRadius: '10px',
                fontSize: '0.875rem',
                border: '1px solid var(--color-error-border, #fecaca)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="email-modal-alert email-modal-alert-success" style={{
                padding: '0.875rem 1rem',
                backgroundColor: 'var(--color-success-bg, #f0fdf4)',
                color: 'var(--color-success, #16a34a)',
                borderRadius: '10px',
                fontSize: '0.875rem',
                border: '1px solid var(--color-success-border, #bbf7d0)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>✓</span> Odpowiedź wysłana pomyślnie!
              </div>
            )}
          </div>

          {/* Reply Footer Actions */}
          <div style={{
            padding: '1.25rem 1.75rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            backgroundColor: 'var(--color-bg-surface)'
          }}>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-secondary"
              style={{
                padding: '0.75rem 1.5rem',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              Zamknij
            </button>
            <button
              onClick={handleSend}
              disabled={isLoading || !subject.trim() || !body.trim()}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.75rem',
                opacity: (isLoading || !subject.trim() || !body.trim()) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
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
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsywność dla mniejszych ekranów */
        @media (max-width: 1200px) {
          .modal-overlay > div {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EmailModal;
