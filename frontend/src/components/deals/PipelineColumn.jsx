import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import DealCard from './DealCard';

const PipelineColumn = ({ stage, deals, onEditDeal, onEmailDeal, onTaskDeal, onSequenceDeal, onDeleteDeal }) => {
  // Ensure deals is an array before filtering
  const dealsArray = Array.isArray(deals) ? deals : [];
  const stageDeals = dealsArray.filter(d => d.stage && d.stage.id === stage.id);
  const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <Droppable droppableId={stage.id.toString()}>
      {(provided, snapshot) => (
        <div
          className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          <div className="column-header" style={{ borderTopColor: stage.color }}>
            <div className="header-top">
              <h3 className="stage-name">{stage.name}</h3>
              <span className="stage-count">{stageDeals.length}</span>
            </div>
            <div className="stage-summary">
              {totalValue.toLocaleString('pl-PL', {
                style: 'currency',
                currency: 'PLN',
                maximumFractionDigits: 0
              })}
            </div>
            {/* Pasek postępu / prawdopodobieństwa */}
            <div className="probability-bar-container" title={`Prawdopodobieństwo: ${stage.probability}%`}>
              <div
                className="probability-bar"
                style={{ width: `${stage.probability}%`, backgroundColor: stage.color }}
              />
            </div>
          </div>

          <div className="column-content">
            {stageDeals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                index={index}
                onEdit={onEditDeal}
                onEmail={onEmailDeal}
                onTask={onTaskDeal}
                onSequence={onSequenceDeal}
                onDelete={onDeleteDeal}
              />
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
};

export default PipelineColumn;
