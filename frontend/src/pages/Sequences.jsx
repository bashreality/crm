import React, { useState, useEffect } from 'react';
import { sequencesApi, contactsApi } from '../services/api';
import './Sequences.css';

const Sequences = () => {
  const [sequences, setSequences] = useState([]);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [steps, setSteps] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [newSequence, setNewSequence] = useState({
    name: '',
    description: '',
    active: true
  });

  const [newStep, setNewStep] = useState({
    stepOrder: 1,
    subject: '',
    body: '',
    delayDays: 0,
    delayHours: 0,
    delayMinutes: 0
  });

  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    fetchSequences();
    fetchContacts();
  }, []);

  const fetchSequences = async () => {
    try {
      const response = await sequencesApi.getAll();
      setSequences(response.data);
    } catch (err) {
      console.error('Error fetching sequences:', err);
      setError('Nie udało się pobrać sekwencji');
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await contactsApi.getAll();
      setContacts(response.data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const fetchSteps = async (sequenceId) => {
    try {
      const response = await sequencesApi.getSteps(sequenceId);
      setSteps(response.data);
    } catch (err) {
      console.error('Error fetching steps:', err);
    }
  };

  const handleCreateSequence = async () => {
    if (!newSequence.name.trim()) {
      alert('Nazwa sekwencji jest wymagana');
      return;
    }

    setLoading(true);
    try {
      await sequencesApi.create(newSequence);
      await fetchSequences();
      setShowCreateModal(false);
      setNewSequence({ name: '', description: '', active: true });
    } catch (err) {
      console.error('Error creating sequence:', err);
      alert('Nie udało się utworzyć sekwencji');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStep = async () => {
    if (!newStep.subject.trim() || !newStep.body.trim()) {
      alert('Temat i treść są wymagane');
      return;
    }

    setLoading(true);
    try {
      await sequencesApi.addStep(selectedSequence.id, newStep);
      await fetchSteps(selectedSequence.id);
      setShowStepModal(false);
      setNewStep({
        stepOrder: steps.length + 2,
        subject: '',
        body: '',
        delayDays: 0,
        delayHours: 0,
        delayMinutes: 0
      });
    } catch (err) {
      console.error('Error adding step:', err);
      alert('Nie udało się dodać kroku');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!confirm('Czy na pewno chcesz usunąć ten krok?')) return;

    try {
      await sequencesApi.deleteStep(stepId);
      await fetchSteps(selectedSequence.id);
    } catch (err) {
      console.error('Error deleting step:', err);
      alert('Nie udało się usunąć kroku');
    }
  };

  const handleStartSequence = async () => {
    if (!selectedContact) {
      alert('Wybierz kontakt');
      return;
    }

    setLoading(true);
    try {
      await sequencesApi.startSequence(selectedSequence.id, selectedContact);
      alert('Sekwencja została uruchomiona!');
      setShowStartModal(false);
      setSelectedContact(null);
    } catch (err) {
      console.error('Error starting sequence:', err);
      alert('Nie udało się uruchomić sekwencji');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSequence = (sequence) => {
    setSelectedSequence(sequence);
    fetchSteps(sequence.id);
  };

  const handleDeleteSequence = async (id) => {
    if (!confirm('Czy na pewno chcesz usunąć tę sekwencję?')) return;

    try {
      await sequencesApi.delete(id);
      await fetchSequences();
      if (selectedSequence?.id === id) {
        setSelectedSequence(null);
        setSteps([]);
      }
    } catch (err) {
      console.error('Error deleting sequence:', err);
      alert('Nie udało się usunąć sekwencji');
    }
  };

  return (
    <div className="sequences-page">
      <div className="page-header">
        <h1>📧 Sekwencje Follow-up</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          ➕ Nowa Sekwencja
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="sequences-container">
        {/* Sequences List */}
        <div className="sequences-list">
          <h2>Moje Sekwencje</h2>
          {sequences.length === 0 ? (
            <p className="empty-state">Brak sekwencji. Utwórz pierwszą!</p>
          ) : (
            <div className="sequence-cards">
              {sequences.map((seq) => (
                <div
                  key={seq.id}
                  className={`sequence-card ${selectedSequence?.id === seq.id ? 'selected' : ''}`}
                  onClick={() => handleSelectSequence(seq)}
                >
                  <div className="sequence-card-header">
                    <h3>{seq.name}</h3>
                    <span className={`status-badge ${seq.active ? 'active' : 'inactive'}`}>
                      {seq.active ? '✓ Aktywna' : '✕ Nieaktywna'}
                    </span>
                  </div>
                  <p className="sequence-description">{seq.description || 'Brak opisu'}</p>
                  <div className="sequence-card-footer">
                    <button
                      className="btn btn-small btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSequence(seq.id);
                      }}
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sequence Details */}
        {selectedSequence && (
          <div className="sequence-details">
            <div className="details-header">
              <h2>{selectedSequence.name}</h2>
              <div className="details-actions">
                <button
                  className="btn btn-success"
                  onClick={() => setShowStartModal(true)}
                >
                  🚀 Uruchom Sekwencję
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setNewStep({ ...newStep, stepOrder: steps.length + 1 });
                    setShowStepModal(true);
                  }}
                >
                  ➕ Dodaj Krok
                </button>
              </div>
            </div>

            <div className="steps-list">
              <h3>Kroki sekwencji ({steps.length})</h3>
              {steps.length === 0 ? (
                <p className="empty-state">Brak kroków. Dodaj pierwszy krok!</p>
              ) : (
                steps.map((step, index) => (
                  <div key={step.id} className="step-card">
                    <div className="step-header">
                      <div className="step-number">Krok {step.stepOrder}</div>
                      <div className="step-delay">
                        ⏱️ Opóźnienie: {step.delayDays}d {step.delayHours}h {step.delayMinutes}m
                      </div>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleDeleteStep(step.id)}
                      >
                        Usuń
                      </button>
                    </div>
                    <div className="step-content">
                      <div className="step-subject">
                        <strong>Temat:</strong> {step.subject}
                      </div>
                      <div className="step-body">
                        <strong>Treść:</strong>
                        <div className="step-body-preview">{step.body}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Sequence Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nowa Sekwencja</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nazwa sekwencji *</label>
                <input
                  type="text"
                  value={newSequence.name}
                  onChange={(e) => setNewSequence({ ...newSequence, name: e.target.value })}
                  placeholder="np. Onboarding Klientów"
                />
              </div>
              <div className="form-group">
                <label>Opis</label>
                <textarea
                  value={newSequence.description}
                  onChange={(e) => setNewSequence({ ...newSequence, description: e.target.value })}
                  placeholder="Opisz cel tej sekwencji..."
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newSequence.active}
                    onChange={(e) => setNewSequence({ ...newSequence, active: e.target.checked })}
                  />
                  {' '}Aktywna
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Anuluj
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateSequence}
                disabled={loading}
              >
                {loading ? 'Tworzenie...' : 'Utwórz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Step Modal */}
      {showStepModal && (
        <div className="modal-overlay" onClick={() => setShowStepModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Dodaj Krok #{newStep.stepOrder}</h2>
              <button className="close-btn" onClick={() => setShowStepModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Temat emaila *</label>
                <input
                  type="text"
                  value={newStep.subject}
                  onChange={(e) => setNewStep({ ...newStep, subject: e.target.value })}
                  placeholder="np. Dzień dobry {{firstName}}!"
                />
                <small>Dostępne zmienne: {'{'}{'{'}}name{'}'}{'}'}, {'{'}{'{'}}firstName{'}'}{'}'}, {'{'}{'{'}}company{'}'}{'}'}, {'{'}{'{'}}position{'}'}{'}'}</small>
              </div>
              <div className="form-group">
                <label>Treść emaila *</label>
                <textarea
                  value={newStep.body}
                  onChange={(e) => setNewStep({ ...newStep, body: e.target.value })}
                  placeholder="Wpisz treść emaila..."
                  rows="8"
                />
              </div>
              <div className="form-group">
                <label>Opóźnienie wysłania</label>
                <div className="delay-inputs">
                  <div>
                    <label>Dni</label>
                    <input
                      type="number"
                      min="0"
                      value={newStep.delayDays}
                      onChange={(e) => setNewStep({ ...newStep, delayDays: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label>Godziny</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={newStep.delayHours}
                      onChange={(e) => setNewStep({ ...newStep, delayHours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label>Minuty</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={newStep.delayMinutes}
                      onChange={(e) => setNewStep({ ...newStep, delayMinutes: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStepModal(false)}>
                Anuluj
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddStep}
                disabled={loading}
              >
                {loading ? 'Dodawanie...' : 'Dodaj Krok'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Sequence Modal */}
      {showStartModal && (
        <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Uruchom Sekwencję</h2>
              <button className="close-btn" onClick={() => setShowStartModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Wybierz kontakt, dla którego chcesz uruchomić sekwencję:</p>
              <div className="form-group">
                <label>Kontakt</label>
                <select
                  value={selectedContact || ''}
                  onChange={(e) => setSelectedContact(parseInt(e.target.value))}
                >
                  <option value="">-- Wybierz kontakt --</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} ({contact.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStartModal(false)}>
                Anuluj
              </button>
              <button
                className="btn btn-success"
                onClick={handleStartSequence}
                disabled={loading || !selectedContact}
              >
                {loading ? 'Uruchamianie...' : '🚀 Uruchom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sequences;
