import React from 'react';

/**
 * Email filters sidebar component
 */
const EmailFilters = ({
  selectedAccount,
  emailAccounts,
  filters,
  companies,
  allTags,
  onAccountChange,
  onFilterChange,
  onClearFilter,
}) => {
  return (
    <aside className="sidebar">
      <h3>Filtry</h3>

      <div className="filter-group">
        <label htmlFor="account">Konto Email</label>
        <select
          id="account"
          name="account"
          className="filter-input"
          value={selectedAccount}
          onChange={onAccountChange}
        >
          <option value="all">🌐 Wszystkie konta ({emailAccounts.length})</option>
          {emailAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              📧 {account.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="search">Szukaj</label>
        <input
          type="text"
          id="search"
          name="search"
          className="filter-input"
          placeholder="Szukaj wiadomości..."
          value={filters.search}
          onChange={onFilterChange}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="company">Firma</label>
        <select
          id="company"
          name="company"
          className="filter-input"
          value={filters.company}
          onChange={onFilterChange}
        >
          <option value="">Wszystkie firmy</option>
          {companies.map((company, index) => (
            <option key={index} value={company}>
              {company}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="status">Status odpowiedzi</label>
        <select
          id="status"
          name="status"
          className="filter-input"
          value={filters.status}
          onChange={onFilterChange}
        >
          <option value="">Wszystkie</option>
          <option value="positive">Pozytywne</option>
          <option value="neutral">Neutralne</option>
          <option value="negative">Negatywne</option>
          <option value="undelivered">Niedostarczone</option>
          <option value="maybeLater">Może później</option>
        </select>
        {filters.status && (
          <button
            className="btn btn-secondary"
            style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.85rem' }}
            onClick={() => onClearFilter('status')}
          >
            ✕ Wyczyść filtr
          </button>
        )}
      </div>

      <div className="filter-group">
        <label htmlFor="tag">Filtruj po tagu</label>
        <select
          id="tag"
          name="tag"
          className="filter-input"
          value={filters.tag}
          onChange={onFilterChange}
        >
          <option value="">Wszystkie tagi</option>
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        {filters.tag && (
          <button
            className="btn btn-secondary"
            style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.85rem' }}
            onClick={() => onClearFilter('tag')}
          >
            ✕ Wyczyść filtr
          </button>
        )}
      </div>
    </aside>
  );
};

export default EmailFilters;

