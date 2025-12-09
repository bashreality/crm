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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '1400px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'row',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT PANEL - Email Preview */}
        <div style={{
          flex: '1 1 55%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e2e8f0',
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          {/* Email Header */}
          <div style={{
            padding: '1.75rem 2rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff'
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
                    color: '#0f172a',
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
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  fontSize: '1.125rem',
                  cursor: 'pointer',
                  color: '#64748b',
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
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#e2e8f0';
                  e.target.style.color = '#334155';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#f1f5f9';
                  e.target.style.color = '#64748b';
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
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '0.875rem 1rem',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.35rem'
                }}>Od</div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#334155',
                  fontWeight: '500',
                  wordBreak: 'break-word'
                }}>{email.sender}</div>
              </div>
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '0.875rem 1rem',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.35rem'
                }}>Firma</div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#334155',
                  fontWeight: '500'
                }}>{email.company || '—'}</div>
              </div>
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '0.875rem 1rem',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.35rem'
                }}>Data</div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#334155',
                  fontWeight: '500'
                }}>{formatDate(email.receivedAt)}</div>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.75rem 2rem'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{
                lineHeight: '1.85',
                fontSize: '0.95rem',
                color: '#334155',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {email.content || email.preview || 'Brak treści wiadomości'}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Reply Composer */}
        <div style={{
          flex: '1 1 45%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #fafbfd 0%, #f1f5f9 100%)',
          minWidth: '380px'
        }}>
          {/* Reply Header */}
          <div style={{
            padding: '1.5rem 1.75rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
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
            gap: '1.25rem'
          }}>
            {/* Subject Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#334155',
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
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: isLoading ? '#f8fafc' : '#ffffff',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
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
                  color: '#334155',
                  fontSize: '0.85rem'
                }}>
                  Treść wiadomości
                </label>
                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating || isLoading}
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
                  onMouseOver={(e) => {
                    if (!isGenerating && !isLoading) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
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
                color: '#334155',
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
              <div style={{
                padding: '0.875rem 1rem',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                borderRadius: '10px',
                fontSize: '0.875rem',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div style={{
                padding: '0.875rem 1rem',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                borderRadius: '10px',
                fontSize: '0.875rem',
                border: '1px solid #bbf7d0',
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
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            backgroundColor: '#ffffff'
          }}>
            <button
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                backgroundColor: '#ffffff',
                color: '#64748b',
                transition: 'all 0.2s',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.target.style.backgroundColor = '#f8fafc';
                  e.target.style.borderColor = '#cbd5e1';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.borderColor = '#e2e8f0';
              }}
            >
              Zamknij
            </button>
            <button
              onClick={handleSend}
              disabled={isLoading || !subject.trim() || !body.trim()}
              style={{
                padding: '0.75rem 1.75rem',
                border: 'none',
                borderRadius: '10px',
                cursor: (isLoading || !subject.trim() || !body.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                transition: 'all 0.2s',
                opacity: (isLoading || !subject.trim() || !body.trim()) ? 0.5 : 1,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseOver={(e) => {
                if (!isLoading && subject.trim() && body.trim()) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.45)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.35)';
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
            transform: translateY(20px) scale(0.98);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Responsywność dla mniejszych ekranów */
        @media (max-width: 1024px) {
          .email-modal-content {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EmailModal;
