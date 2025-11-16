import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Pipeline.css';

const API_URL = 'http://localhost:8080/api';

function Pipeline() {
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showDealModal, setShowDealModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [draggedDeal, setDraggedDeal] = useState(null);

  const [newDeal, setNewDeal] = useState({
    title: '',
    description: '',
    contactId: '',
    value: 0,
    currency: 'PLN',
    priority: 3,
    expectedCloseDate: ''
  });

  useEffect(() => {
    loadPipelines();
    loadContacts();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      loadStages();
      loadDeals();
    }
  }, [selectedPipeline]);

  const loadPipelines = async () => {
    try {
      const response = await axios.get(`${API_URL}/pipelines`);
      setPipelines(response.data);

      // Select default pipeline
      const defaultPipeline = response.data.find(p => p.isDefault) || response.data[0];
      if (defaultPipeline) {
        setSelectedPipeline(defaultPipeline);
      }
    } catch (error) {
      console.error('Error loading pipelines:', error);
    }
  };

  const loadStages = async () => {
    try {
      const response = await axios.get(`${API_URL}/pipelines/${selectedPipeline.id}/stages`);
      setStages(response.data);
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  };

  const loadDeals = async () => {
    try {
      const response = await axios.get(`${API_URL}/deals/pipeline/${selectedPipeline.id}`);
      setDeals(response.data);
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await axios.get(`${API_URL}/contacts`);
      setContacts(response.data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();

    if (!newDeal.contactId) {
      alert('Proszę wybrać kontakt');
      return;
    }

    const selectedContact = contacts.find(c => c.id === parseInt(newDeal.contactId));
    const firstStage = stages[0];

    const dealData = {
      title: newDeal.title,
      description: newDeal.description,
      contact: selectedContact,
      pipeline: selectedPipeline,
      stage: firstStage,
      value: parseFloat(newDeal.value) || 0,
      currency: newDeal.currency,
      priority: parseInt(newDeal.priority),
      expectedCloseDate: newDeal.expectedCloseDate || null,
      status: 'open'
    };

    try {
      await axios.post(`${API_URL}/deals`, dealData);
      setShowDealModal(false);
      setNewDeal({
        title: '',
        description: '',
        contactId: '',
        value: 0,
        currency: 'PLN',
        priority: 3,
        expectedCloseDate: ''
      });
      loadDeals();
    } catch (error) {
      console.error('Error creating deal:', error);
      alert('Błąd podczas tworzenia deala');
    }
  };

  const handleDragStart = (e, deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();

    if (!draggedDeal) return;

    if (draggedDeal.stage.id === targetStage.id) {
      setDraggedDeal(null);
      return;
    }

    try {
      const updatedDeal = {
        ...draggedDeal,
        stage: targetStage
      };

      await axios.put(`${API_URL}/deals/${draggedDeal.id}`, updatedDeal);
      loadDeals();
      setDraggedDeal(null);
    } catch (error) {
      console.error('Error moving deal:', error);
      alert('Błąd podczas przenoszenia deala');
    }
  };

  const handleWinDeal = async (deal) => {
    if (confirm('Oznaczyć ten deal jako wygrany?')) {
      try {
        await axios.put(`${API_URL}/deals/${deal.id}/status/won`);
        loadDeals();
      } catch (error) {
        console.error('Error winning deal:', error);
      }
    }
  };

  const handleLoseDeal = async (deal) => {
    const reason = prompt('Powód przegranego deala:');
    if (reason !== null) {
      try {
        await axios.put(`${API_URL}/deals/${deal.id}/status/lost`, reason, {
          headers: { 'Content-Type': 'text/plain' }
        });
        loadDeals();
      } catch (error) {
        console.error('Error losing deal:', error);
      }
    }
  };

  const getDealsByStage = (stageId) => {
    return deals.filter(d => d.stage.id === stageId && d.status === 'open');
  };

  const getTotalValueByStage = (stageId) => {
    return getDealsByStage(stageId).reduce((sum, deal) => sum + deal.value, 0);
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 1: return '#EF4444'; // High - Red
      case 2: return '#F59E0B'; // Medium - Orange
      case 3: return '#10B981'; // Low - Green
      default: return '#6B7280';
    }
  };

  const getPriorityLabel = (priority) => {
    switch(priority) {
      case 1: return 'Wysoki';
      case 2: return 'Średni';
      case 3: return 'Niski';
      default: return 'Nieznany';
    }
  };

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <div>
          <h1>Pipeline Sprzedaży</h1>
          <div className="pipeline-selector">
            <select
              value={selectedPipeline?.id || ''}
              onChange={(e) => {
                const pipeline = pipelines.find(p => p.id === parseInt(e.target.value));
                setSelectedPipeline(pipeline);
              }}
            >
              {pipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowDealModal(true)}>
          + Nowy Deal
        </button>
      </div>

      <div className="pipeline-stats">
        <div className="stat-card">
          <div className="stat-value">{deals.filter(d => d.status === 'open').length}</div>
          <div className="stat-label">Aktywne Deale</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {deals.filter(d => d.status === 'open').reduce((sum, d) => sum + d.value, 0).toLocaleString()} PLN
          </div>
          <div className="stat-label">Wartość Pipeline</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{deals.filter(d => d.status === 'won').length}</div>
          <div className="stat-label">Wygrane</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {deals.filter(d => d.status === 'won').reduce((sum, d) => sum + d.value, 0).toLocaleString()} PLN
          </div>
          <div className="stat-label">Wartość Wygranych</div>
        </div>
      </div>

      <div className="kanban-board">
        {stages.map(stage => (
          <div
            key={stage.id}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="column-header" style={{ borderTopColor: stage.color }}>
              <div className="column-title">
                <span>{stage.name}</span>
                <span className="deal-count">{getDealsByStage(stage.id).length}</span>
              </div>
              <div className="column-value">
                {getTotalValueByStage(stage.id).toLocaleString()} PLN
              </div>
              <div className="column-probability">
                {stage.probability}% win rate
              </div>
            </div>

            <div className="deals-list">
              {getDealsByStage(stage.id).map(deal => (
                <div
                  key={deal.id}
                  className="deal-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal)}
                  onClick={() => setSelectedDeal(deal)}
                >
                  <div className="deal-header">
                    <h4>{deal.title}</h4>
                    <div
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(deal.priority) }}
                    >
                      {getPriorityLabel(deal.priority)}
                    </div>
                  </div>

                  <div className="deal-contact">
                    👤 {deal.contact.name}
                  </div>

                  {deal.contact.company && (
                    <div className="deal-company">
                      🏢 {deal.contact.company}
                    </div>
                  )}

                  <div className="deal-value">
                    💰 {deal.value.toLocaleString()} {deal.currency}
                  </div>

                  {deal.expectedCloseDate && (
                    <div className="deal-date">
                      📅 {new Date(deal.expectedCloseDate).toLocaleDateString('pl-PL')}
                    </div>
                  )}

                  <div className="deal-actions">
                    <button
                      className="btn-win"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWinDeal(deal);
                      }}
                    >
                      ✓ Wygrane
                    </button>
                    <button
                      className="btn-lose"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoseDeal(deal);
                      }}
                    >
                      ✗ Przegrane
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showDealModal && (
        <div className="modal-overlay" onClick={() => setShowDealModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nowy Deal</h2>
              <button className="close-btn" onClick={() => setShowDealModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateDeal}>
              <div className="form-group">
                <label>Tytuł *</label>
                <input
                  type="text"
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({...newDeal, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Kontakt *</label>
                <select
                  value={newDeal.contactId}
                  onChange={(e) => setNewDeal({...newDeal, contactId: e.target.value})}
                  required
                >
                  <option value="">Wybierz kontakt...</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.company ? `(${contact.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Opis</label>
                <textarea
                  value={newDeal.description}
                  onChange={(e) => setNewDeal({...newDeal, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Wartość</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newDeal.value}
                    onChange={(e) => setNewDeal({...newDeal, value: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Waluta</label>
                  <select
                    value={newDeal.currency}
                    onChange={(e) => setNewDeal({...newDeal, currency: e.target.value})}
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priorytet</label>
                  <select
                    value={newDeal.priority}
                    onChange={(e) => setNewDeal({...newDeal, priority: e.target.value})}
                  >
                    <option value="1">Wysoki</option>
                    <option value="2">Średni</option>
                    <option value="3">Niski</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Oczekiwana data zamknięcia</label>
                  <input
                    type="date"
                    value={newDeal.expectedCloseDate}
                    onChange={(e) => setNewDeal({...newDeal, expectedCloseDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowDealModal(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn-primary">
                  Utwórz Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDeal && (
        <div className="modal-overlay" onClick={() => setSelectedDeal(null)}>
          <div className="modal-content deal-details" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDeal.title}</h2>
              <button className="close-btn" onClick={() => setSelectedDeal(null)}>×</button>
            </div>

            <div className="deal-info">
              <div className="info-row">
                <strong>Kontakt:</strong> {selectedDeal.contact.name}
              </div>
              {selectedDeal.contact.company && (
                <div className="info-row">
                  <strong>Firma:</strong> {selectedDeal.contact.company}
                </div>
              )}
              <div className="info-row">
                <strong>Email:</strong> {selectedDeal.contact.email}
              </div>
              {selectedDeal.contact.phone && (
                <div className="info-row">
                  <strong>Telefon:</strong> {selectedDeal.contact.phone}
                </div>
              )}
              <div className="info-row">
                <strong>Wartość:</strong> {selectedDeal.value.toLocaleString()} {selectedDeal.currency}
              </div>
              <div className="info-row">
                <strong>Etap:</strong> {selectedDeal.stage.name}
              </div>
              <div className="info-row">
                <strong>Priorytet:</strong>
                <span style={{ color: getPriorityColor(selectedDeal.priority) }}>
                  {' '}{getPriorityLabel(selectedDeal.priority)}
                </span>
              </div>
              {selectedDeal.expectedCloseDate && (
                <div className="info-row">
                  <strong>Oczekiwana data:</strong> {new Date(selectedDeal.expectedCloseDate).toLocaleDateString('pl-PL')}
                </div>
              )}
              {selectedDeal.description && (
                <div className="info-row">
                  <strong>Opis:</strong>
                  <p>{selectedDeal.description}</p>
                </div>
              )}
              <div className="info-row">
                <strong>Utworzono:</strong> {new Date(selectedDeal.createdAt).toLocaleString('pl-PL')}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-win" onClick={() => { handleWinDeal(selectedDeal); setSelectedDeal(null); }}>
                ✓ Oznacz jako Wygrane
              </button>
              <button className="btn-lose" onClick={() => { handleLoseDeal(selectedDeal); setSelectedDeal(null); }}>
                ✗ Oznacz jako Przegrane
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pipeline;
