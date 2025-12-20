import React from 'react';
import './EmptyState.css';

/**
 * Empty state component for when lists/tables have no data
 * @param {string} icon - Icon to display (emoji or component)
 * @param {string} title - Main title text
 * @param {string} description - Description text
 * @param {string} actionText - Optional button text
 * @param {function} onAction - Optional button click handler
 */
const EmptyState = ({
  icon = '📭',
  title = 'Brak danych',
  description = 'Nie znaleziono żadnych elementów',
  actionText,
  onAction
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionText && onAction && (
        <button className="empty-state-action" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};

/**
 * Preset empty states for common scenarios
 */
export const EmptyContacts = ({ onAction }) => (
  <EmptyState
    icon="👥"
    title="Brak kontaktów"
    description="Nie masz jeszcze żadnych kontaktów. Dodaj pierwszy kontakt lub zaimportuj z pliku CSV."
    actionText="Dodaj kontakt"
    onAction={onAction}
  />
);

export const EmptyDeals = ({ onAction }) => (
  <EmptyState
    icon="💼"
    title="Brak szans sprzedaży"
    description="Nie masz jeszcze żadnych szans sprzedaży w tym lejku."
    actionText="Dodaj nową szansę"
    onAction={onAction}
  />
);

export const EmptyEmails = () => (
  <EmptyState
    icon="📧"
    title="Brak wiadomości"
    description="Nie masz jeszcze żadnych wiadomości email."
  />
);

export const EmptyTasks = ({ onAction }) => (
  <EmptyState
    icon="✅"
    title="Brak zadań"
    description="Nie masz żadnych zadań do wykonania. Świetna robota!"
    actionText="Dodaj zadanie"
    onAction={onAction}
  />
);

export const EmptySearch = ({ query }) => (
  <EmptyState
    icon="🔍"
    title="Brak wyników"
    description={`Nie znaleziono wyników dla "${query}". Spróbuj użyć innych słów kluczowych.`}
  />
);

export const EmptyCalendar = ({ onAction }) => (
  <EmptyState
    icon="📅"
    title="Brak wydarzeń"
    description="Nie masz żadnych zaplanowanych wydarzeń na ten dzień."
    actionText="Dodaj wydarzenie"
    onAction={onAction}
  />
);

export const ErrorState = ({ message, onRetry }) => (
  <EmptyState
    icon="⚠️"
    title="Wystąpił błąd"
    description={message || 'Nie udało się załadować danych. Spróbuj ponownie.'}
    actionText="Spróbuj ponownie"
    onAction={onRetry}
  />
);

export default EmptyState;
