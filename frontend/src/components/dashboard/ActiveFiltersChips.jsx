import React from 'react';

/**
 * Active filter chips display
 */
const ActiveFiltersChips = ({ filters, allTags, onClearFilter, getStatusLabel }) => {
  const hasFilters = filters.search || filters.company || filters.status || filters.tag;

  if (!hasFilters) return null;

  const chipStyle = (bg, color) => ({
    background: bg,
    color: color,
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  });

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
  };

  return (
    <div
      style={{
        background: '#f9fafb',
        padding: '12px 20px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>
        Aktywne filtry:
      </span>
      
      {filters.search && (
        <span style={chipStyle('#dbeafe', '#1e40af')}>
          Szukaj: "{filters.search}"
          <button onClick={() => onClearFilter('search')} style={closeButtonStyle}>×</button>
        </span>
      )}
      
      {filters.company && (
        <span style={chipStyle('#dcfce7', '#166534')}>
          Firma: {filters.company}
          <button onClick={() => onClearFilter('company')} style={closeButtonStyle}>×</button>
        </span>
      )}
      
      {filters.status && (
        <span style={chipStyle('#fef3c7', '#92400e')}>
          Status: {getStatusLabel(filters.status)}
          <button onClick={() => onClearFilter('status')} style={closeButtonStyle}>×</button>
        </span>
      )}
      
      {filters.tag && (
        <span style={chipStyle('#e0e7ff', '#3730a3')}>
          Tag: {allTags.find((t) => t.id === parseInt(filters.tag))?.name || 'Nieznany'}
          <button onClick={() => onClearFilter('tag')} style={closeButtonStyle}>×</button>
        </span>
      )}
    </div>
  );
};

export default ActiveFiltersChips;

