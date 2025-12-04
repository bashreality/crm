import React from 'react';

/**
 * Bulk actions bar for selected emails
 */
const BulkActionsBar = ({
  selectedCount,
  totalCount,
  onToggleSelectAll,
  onBulkTag,
  onBulkDelete,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        background: '#eff6ff',
        borderBottom: '2px solid #3b82f6',
        padding: '12px 20px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <button
        className="btn btn-secondary"
        onClick={onToggleSelectAll}
        style={{ fontSize: '0.9rem' }}
      >
        {selectedCount === totalCount ? '☑️ Odznacz wszystkie' : '☐ Zaznacz wszystkie'}
      </button>
      <button
        className="btn btn-secondary"
        onClick={onBulkTag}
        style={{ fontSize: '0.9rem', background: '#dbeafe', color: '#1e40af' }}
      >
        🏷️ Dodaj tag
      </button>
      <button
        className="btn btn-secondary"
        onClick={onBulkDelete}
        style={{ fontSize: '0.9rem', background: '#fee2e2', color: '#ef4444' }}
      >
        🗑️ Usuń zaznaczone
      </button>
    </div>
  );
};

export default BulkActionsBar;

