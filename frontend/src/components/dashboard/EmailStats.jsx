import React from 'react';

/**
 * Email statistics cards component
 */
const EmailStats = ({ stats, onStatClick }) => {
  const statCards = [
    { key: 'positive', label: 'Pozytywne odpowiedzi', value: stats.positive, colorClass: 'positive' },
    { key: 'neutral', label: 'Do przejrzenia', value: stats.neutral, colorClass: 'neutral' },
    { key: 'negative', label: 'Odmowy kontaktu', value: stats.negative, colorClass: 'negative' },
    { key: 'undelivered', label: 'Niedostarczone', value: stats.undelivered, colorClass: 'negative' },
    { key: 'maybeLater', label: 'Może później', value: stats.maybeLater, colorClass: 'neutral' },
    { key: 'auto_reply', label: 'Automatyczna odpowiedź', value: stats.auto_reply, colorClass: 'negative' },
  ];

  return (
    <div className="stats-grid">
      {statCards.map(({ key, label, value, colorClass }) => (
        <div
          key={key}
          className="stat-card"
          onClick={() => onStatClick(key)}
          style={{ cursor: 'pointer' }}
        >
          <div className={`stat-number ${colorClass}`}>{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
};

export default EmailStats;

