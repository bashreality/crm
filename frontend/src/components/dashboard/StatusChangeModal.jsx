import React from 'react';

/**
 * Modal for changing email status/classification
 */
const StatusChangeModal = ({ email, onClose, onChangeStatus }) => {
  if (!email) return null;

  const statusOptions = [
    { status: 'positive', label: '✅ Pozytywna odpowiedź', color: '#10b981' },
    { status: 'neutral', label: '⚪ Do przejrzenia (Neutralna)', color: '#6b7280' },
    { status: 'negative', label: '❌ Odmowa kontaktu (Negatywna)', color: '#ef4444' },
    { status: 'undelivered', label: '📭 Niedostarczona', color: '#f97316' },
    { status: 'maybeLater', label: '⏰ Może później', color: '#f59e0b' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Zmień klasyfikację emaila</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            Wybierz nową klasyfikację dla emaila
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {statusOptions.map(({ status, label, color }) => (
              <button
                key={status}
                className="btn btn-secondary"
                onClick={() => onChangeStatus(email.id, status)}
                style={{
                  justifyContent: 'flex-start',
                  padding: '12px',
                  borderLeft: `4px solid ${color}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeModal;

