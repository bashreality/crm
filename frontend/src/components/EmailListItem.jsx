import React from 'react';
import '../styles/EmailListItem.css';

const EmailListItem = ({
  email,
  isSelected,
  compactView,
  onSelect,
  onClick,
  onCreateDeal,
  onTag,
  onReply,
  onDelete,
  onChangeStatus,
  formatDate,
  getTrackingIcon,
  truncateText,
  getInitials,
  getAvatarColor,
  getEmailStatus
}) => {
  const emailAddress = email.sender.match(/<(.+?)>/)?.[1] || email.sender;
  const senderName = email.sender.replace(/<.+?>/, '').trim() || emailAddress;

  return (
    <div
      className={`email-list-item ${compactView ? 'compact' : 'expanded'} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* Checkbox */}
      <div className="email-checkbox" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
        />
      </div>

      {/* Avatar */}
      <div
        className="email-avatar"
        style={{ backgroundColor: getAvatarColor(email) }}
        title={emailAddress}
      >
        {getInitials(email)}
      </div>

      {/* Main Content */}
      <div className="email-content">
        {/* First Line: Sender + Company + Status Badges */}
        <div className="email-first-line">
          <div className="email-sender-info">
            <span className="email-sender-name" title={senderName}>
              {truncateText(senderName, 30)}
            </span>
            {email.company && (
              <span className="email-company" title={email.company}>
                {truncateText(email.company, 25)}
              </span>
            )}
          </div>

          {/* Status Badges */}
          <div className="email-status-badges">
            {getEmailStatus(email).map((status, idx) => (
              <span
                key={idx}
                className="status-badge"
                style={{ backgroundColor: status.color, color: 'white' }}
                title={status.label}
              >
                {status.text}
              </span>
            ))}
          </div>
        </div>

        {/* Second Line: Subject */}
        <div className="email-subject" title={email.subject || '(Brak tematu)'}>
          {truncateText(email.subject || '(Brak tematu)', compactView ? 60 : 80)}
        </div>

        {/* Third Line: Preview (only in expanded view) */}
        {!compactView && (
          <div className="email-preview">
            {truncateText(email.preview || 'Brak podglądu treści', 120)}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="email-tags-col">
        {email.senderTags && email.senderTags.length > 0 && (
          <div className="email-tag-list">
            {email.senderTags.slice(0, 2).map(tag => (
              <span
                key={tag.id}
                className="email-tag-pill"
                style={{ backgroundColor: tag.color }}
                title={tag.name}
              >
                {truncateText(tag.name, 12)}
              </span>
            ))}
            {email.senderTags.length > 2 && (
              <span className="email-tag-more" title={`+${email.senderTags.length - 2} więcej tagów`}>
                +{email.senderTags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Time */}
      <div className="email-time-col">
        <span className="email-time">{formatDate(email.receivedAt)}</span>
        {getTrackingIcon(email)}
      </div>

      {/* Actions */}
      <div className="email-actions-col">
        <div className="email-actions">
          <button
            className="action-btn action-task"
            onClick={(e) => onCreateDeal(email, e)}
            title="Dodaj szansę"
          >
            💰
          </button>
          <button
            className="action-btn action-tag"
            onClick={(e) => onTag(email, e)}
            title="Dodaj tag"
          >
            🏷️
          </button>
          <button
            className="action-btn action-status"
            onClick={(e) => onChangeStatus(email, e)}
            title="Zmień klasyfikację"
          >
            🔄
          </button>
          <button
            className="action-btn action-reply"
            onClick={(e) => onReply(email, e)}
            title="Odpowiedz"
          >
            ↩️
          </button>
          <button
            className="action-btn action-delete"
            onClick={(e) => onDelete(email.id, e)}
            title="Usuń"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailListItem;
