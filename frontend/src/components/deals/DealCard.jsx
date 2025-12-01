import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import {
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  Building2,
  User,
  AlertCircle,
  Zap
} from 'lucide-react';

const DealCard = ({ deal, index, onEdit, onEmail, onTask, onSequence }) => {

  // Funkcja pomocnicza do określania koloru priorytetu
  const getPriorityColor = (priority) => {
    switch (String(priority)) {
      case '1': return { bg: '#FEE2E2', text: '#DC2626', label: 'Wysoki' };
      case '2': return { bg: '#FEF3C7', text: '#D97706', label: 'Średni' };
      default: return { bg: '#E5E7EB', text: '#4B5563', label: 'Niski' };
    }
  };

  const priorityStyle = getPriorityColor(deal.priority);

  return (
    <Draggable draggableId={deal.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          className={`deal-card ${snapshot.isDragging ? 'dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <div className="deal-card-header">
            <span className="deal-priority" style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.text }}>
              {priorityStyle.label}
            </span>
            <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); onEdit(deal); }}>
              <MoreHorizontal size={16} />
            </button>
          </div>

          <h4 className="deal-title">{deal.title}</h4>
          
          <div className="deal-value">
            {deal.value.toLocaleString('pl-PL', { 
              style: 'currency', 
              currency: deal.currency,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </div>

          <div className="deal-meta">
            {deal.contact?.name && (
              <div className="meta-row">
                <User size={14} />
                <span className="truncate">{deal.contact.name}</span>
              </div>
            )}
            {deal.contact?.company && (
              <div className="meta-row">
                <Building2 size={14} />
                <span className="truncate">{deal.contact.company}</span>
              </div>
            )}
          </div>

          {/* Pasek aktywności - "Rotting Deal" indicator (np. > 7 dni bez zmian) */}
          {/* Tutaj można dodać logikę sprawdzania daty ostatniej aktualizacji */}
          
          <div className="deal-actions-footer">
              <button
              className="action-btn"
              onClick={(e) => { e.stopPropagation(); onSequence(deal); }}
              title="Uruchom sekwencję"
            >
              <Zap size={14} />
            </button>
            <button
              className="action-btn"
              onClick={(e) => { e.stopPropagation(); onTask(deal); }}
              title="Dodaj zadanie"
            >
              <Calendar size={14} />
            </button>
            <button
              className="action-btn"
              onClick={(e) => { e.stopPropagation(); onEmail(deal); }}
              title="Wyślij email"
            >
              <Mail size={14} />
            </button>
            {deal.contact?.phone && (
               <a
                 href={`tel:${deal.contact.phone}`}
                 className="action-btn"
                 onClick={(e) => e.stopPropagation()}
                 title="Zadzwoń"
               >
                 <Phone size={14} />
               </a>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default DealCard;
