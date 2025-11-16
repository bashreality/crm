import React, { useEffect, useMemo, useState } from 'react';
import { sequencesApi, contactsApi } from '../services/api';
import './Sequences.css';

const initialSequenceForm = {
  name: '',
  description: '',
  active: true,
  timezone: 'Europe/Warsaw',
  sendWindowStart: '09:00',
  sendWindowEnd: '17:00',
  sendOnWeekends: false,
  dailySendingLimit: '',
  throttlePerHour: '',
  steps: [],
};

const initialStepForm = {
  stepOrder: 1,
  stepType: 'email',
  subject: '',
  body: '',
  delayDays: 0,
  delayHours: 0,
  delayMinutes: 0,
  waitForReplyHours: 0,
  skipIfReplied: true,
  trackOpens: false,
  trackClicks: false,
};

const timezoneOptions = [
  'Europe/Warsaw',
  'Europe/Berlin',
  'Europe/London',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
];

const stepTypeOptions = [
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Telefon' },
  { value: 'task', label: 'Zadanie' },
  { value: 'linkedin', label: 'LinkedIn' },
];

const Sequences = () => {
  const [dashboard, setDashboard] = useState(null);
  const [sequences, setSequences] = useState([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState(null);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [sequenceForm, setSequenceForm] = useState(initialSequenceForm);
  const [stepForm, setStepForm] = useState(initialStepForm);
  const [stepIndexEditing, setStepIndexEditing] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState('');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [isEditingSequence, setIsEditingSequence] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, sequencesRes, contactsRes] = await Promise.all([
        sequencesApi.getDashboard(),
        sequencesApi.getAll(),
        contactsApi.getAll(),
      ]);
      setDashboard(dashboardRes.data);
      setSequences(sequencesRes.data);
      setContacts(contactsRes.data);

      if (sequencesRes.data.length > 0) {
        const defaultSequence = sequencesRes.data[0];
        await handleSelectSequence(defaultSequence.id);
      }
    } catch (err) {
      console.error('Nie udało się pobrać danych sekwencji:', err);
      setError('Nie udało się pobrać danych sekwencji. Spróbuj ponownie później.');
    } finally {
      setLoading(false);
    }
  };

  const refreshSequences = async () => {
    try {
      const [dashboardRes, sequencesRes] = await Promise.all([
        sequencesApi.getDashboard(),
        sequencesApi.getAll(),
      ]);
      setDashboard(dashboardRes.data);
      setSequences(sequencesRes.data);
    } catch (err) {
      console.error('Nie udało się odświeżyć listy sekwencji:', err);
    }
  };

  const handleSelectSequence = async (sequenceId) => {
    setSelectedSequenceId(sequenceId);
    setSelectedSequence(null);
    try {
      const response = await sequencesApi.getById(sequenceId);
      setSelectedSequence(response.data);
    } catch (err) {
      console.error('Nie udało się wczytać szczegółów sekwencji:', err);
      setError('Nie udało się wczytać szczegółów sekwencji.');
    }
  };

  const handleOpenCreateSequence = () => {
    setSequenceForm({ ...initialSequenceForm });
    setIsEditingSequence(false);
    setShowSequenceModal(true);
  };

  const handleOpenEditSequence = () => {
    if (!selectedSequence) return;
    const { summary, steps } = selectedSequence;
    setSequenceForm({
      name: summary.name,
      description: summary.description || '',
      active: summary.active,
      timezone: summary.timezone || 'Europe/Warsaw',
      sendWindowStart: summary.sendWindowStart || '09:00',
      sendWindowEnd: summary.sendWindowEnd || '17:00',
      sendOnWeekends: summary.sendOnWeekends || false,
      dailySendingLimit: summary.dailySendingLimit ?? '',
      throttlePerHour: summary.throttlePerHour ?? '',
      steps: steps.map((step) => ({
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        subject: step.subject,
        body: step.body,
        delayDays: step.delayDays,
        delayHours: step.delayHours,
        delayMinutes: step.delayMinutes,
        waitForReplyHours: step.waitForReplyHours,
        skipIfReplied: step.skipIfReplied,
        trackOpens: step.trackOpens,
        trackClicks: step.trackClicks,
      })),
    });
    setIsEditingSequence(true);
    setShowSequenceModal(true);
  };

  const handleSequenceFormChange = (field, value) => {
    setSequenceForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStepFormChange = (field, value) => {
    setStepForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const normalizeNumber = (value, fallback = 0) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const buildSequencePayload = () => {
    const payload = {
      name: sequenceForm.name.trim(),
      description: sequenceForm.description?.trim() || null,
      active: sequenceForm.active,
      timezone: sequenceForm.timezone,
      sendWindowStart: sequenceForm.sendWindowStart || '09:00',
      sendWindowEnd: sequenceForm.sendWindowEnd || '17:00',
      sendOnWeekends: sequenceForm.sendOnWeekends,
      dailySendingLimit: sequenceForm.dailySendingLimit === '' ? null : Number(sequenceForm.dailySendingLimit),
      throttlePerHour: sequenceForm.throttlePerHour === '' ? null : Number(sequenceForm.throttlePerHour),
      steps: sequenceForm.steps
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((step, index) => ({
          stepOrder: normalizeNumber(step.stepOrder, index + 1),
          stepType: step.stepType,
          subject: step.subject.trim(),
          body: step.body.trim(),
          delayDays: normalizeNumber(step.delayDays),
          delayHours: normalizeNumber(step.delayHours),
          delayMinutes: normalizeNumber(step.delayMinutes),
          waitForReplyHours: normalizeNumber(step.waitForReplyHours),
          skipIfReplied: step.skipIfReplied,
          trackOpens: step.trackOpens,
          trackClicks: step.trackClicks,
        })),
    };

    if (!payload.name) {
      throw new Error('Nazwa sekwencji jest wymagana.');
    }

    payload.steps.forEach((step, idx) => {
      if (!step.subject || !step.body) {
        throw new Error(`Uzupełnij temat i treść dla kroku nr ${idx + 1}.`);
      }
    });

    return payload;
  };

  const handleSubmitSequence = async (event) => {
    event.preventDefault();
    try {
      const payload = buildSequencePayload();
      setActionLoading(true);

      if (isEditingSequence && selectedSequenceId) {
        await sequencesApi.update(selectedSequenceId, payload);
        await handleSelectSequence(selectedSequenceId);
      } else {
        const response = await sequencesApi.create(payload);
        await handleSelectSequence(response.data.summary.id);
      }

      setShowSequenceModal(false);
      await refreshSequences();
    } catch (err) {
      console.error('Błąd zapisu sekwencji:', err);
      alert(err.response?.data?.error || err.message || 'Nie udało się zapisać sekwencji.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenStepModal = (step = null, index = null) => {
    if (step) {
      setStepForm({ ...step });
      setStepIndexEditing(index);
    } else {
      setStepForm({
        ...initialStepForm,
        stepOrder: sequenceForm.steps.length + 1,
      });
      setStepIndexEditing(null);
    }
    setShowStepModal(true);
  };

  const handleSubmitStep = (event) => {
    event.preventDefault();

    if (!stepForm.subject.trim() || !stepForm.body.trim()) {
      alert('Temat i treść są wymagane.');
      return;
    }

    const normalizedStep = {
      ...stepForm,
      stepOrder: normalizeNumber(stepForm.stepOrder, sequenceForm.steps.length + 1),
      delayDays: normalizeNumber(stepForm.delayDays),
      delayHours: normalizeNumber(stepForm.delayHours),
      delayMinutes: normalizeNumber(stepForm.delayMinutes),
      waitForReplyHours: normalizeNumber(stepForm.waitForReplyHours),
    };

    setSequenceForm((prev) => {
      const nextSteps = [...prev.steps];
      if (stepIndexEditing !== null) {
        nextSteps[stepIndexEditing] = normalizedStep;
      } else {
        nextSteps.push(normalizedStep);
      }
      return {
        ...prev,
        steps: nextSteps.sort((a, b) => a.stepOrder - b.stepOrder),
      };
    });

    setShowStepModal(false);
  };

  const handleDeleteLocalStep = (index) => {
    setSequenceForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, idx) => idx !== index),
    }));
  };

  const handleDeleteSequence = async (sequenceId) => {
    const confirmed = window.confirm('Czy na pewno chcesz usunąć tę sekwencję?');
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await sequencesApi.delete(sequenceId);
      await refreshSequences();
      if (selectedSequenceId === sequenceId) {
        setSelectedSequence(null);
        setSelectedSequenceId(null);
      }
    } catch (err) {
      console.error('Nie udało się usunąć sekwencji:', err);
      alert('Nie udało się usunąć sekwencji.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartSequence = async () => {
    if (!selectedContactId) {
      alert('Wybierz kontakt.');
      return;
    }
    try {
      setActionLoading(true);
      await sequencesApi.startSequence(selectedSequenceId, Number(selectedContactId));
      setShowStartModal(false);
      setSelectedContactId('');
      await refreshSequences();
      await handleSelectSequence(selectedSequenceId);
      alert('Sekwencja została uruchomiona dla wybranego kontaktu.');
    } catch (err) {
      console.error('Nie udało się uruchomić sekwencji:', err);
      alert(err.response?.data?.error || 'Nie udało się uruchomić sekwencji.');
    } finally {
      setActionLoading(false);
    }
  };

  const metrics = useMemo(() => {
    if (!dashboard) {
      return [];
    }
    return [
      {
        label: 'Aktywne sekwencje',
        value: dashboard.activeSequences,
        accent: 'positive',
      },
      {
        label: 'Pauzowane sekwencje',
        value: dashboard.pausedSequences,
        accent: 'neutral',
      },
      {
        label: 'Aktywne wykonania',
        value: dashboard.activeExecutions,
        accent: 'primary',
      },
      {
        label: 'Zaplanowane wysyłki',
        value: dashboard.pendingScheduledEmails,
        accent: 'warning',
      },
    ];
  }, [dashboard]);

  const renderSequenceStatus = (summary) => {
    if (!summary) return null;
    return (
      <span className={`sequence-status ${summary.active ? 'active' : 'inactive'}`}>
        {summary.active ? 'Aktywna' : 'Wstrzymana'}
      </span>
    );
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="sequences-wrapper">
      <div className="sequences-topbar">
        <div>
          <h1>Automatyczne sekwencje</h1>
          <p>Buduj wieloetapowe follow-upy i kontroluj harmonogram wysyłek.</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreateSequence}>
          + Nowa sekwencja
        </button>
      </div>

      {error && <div className="sequences-error">{error}</div>}

      <section className="sequences-metrics">
        {metrics.map((metric) => (
          <div key={metric.label} className={`metric-tile ${metric.accent}`}>
            <span className="metric-label">{metric.label}</span>
            <span className="metric-value">{metric.value}</span>
          </div>
        ))}
      </section>

      <div className="sequences-layout">
        <aside className="sequences-list">
          <div className="sequences-list__header">
            <h2>Twoje sekwencje</h2>
            <span>{sequences.length}</span>
          </div>
          <div className="sequences-list__items">
            {loading && sequences.length === 0 && (
              <div className="sequences-placeholder">Ładowanie sekwencji...</div>
            )}
            {!loading && sequences.length === 0 && (
              <div className="sequences-placeholder">
                <p>Brak sekwencji</p>
                <span>Dodaj pierwszą sekwencję, aby zacząć automatyzować follow-upy.</span>
              </div>
            )}
            {sequences.map((sequence) => (
              <button
                key={sequence.id}
                className={`sequence-tile ${selectedSequenceId === sequence.id ? 'selected' : ''}`}
                onClick={() => handleSelectSequence(sequence.id)}
                type="button"
              >
                <div className="sequence-tile__header">
                  <h3>{sequence.name}</h3>
                  {renderSequenceStatus(sequence)}
                </div>
                <p>{sequence.description || 'Brak opisu'}</p>
                <div className="sequence-tile__meta">
                  <span>📬 Kroki: {sequence.stepsCount}</span>
                  <span>▶️ Aktywne wykonania: {sequence.executionsActive}</span>
                </div>
                <div className="sequence-tile__footer">
                  <span>Następna wysyłka: {formatDateTime(sequence.nextScheduledSend)}</span>
                  <button
                    className="text-link"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteSequence(sequence.id);
                    }}
                    disabled={actionLoading}
                  >
                    Usuń
                  </button>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="sequence-details">
          {!selectedSequence && (
            <div className="sequence-details__placeholder">
              <p>Wybierz sekwencję z listy, aby zobaczyć szczegóły.</p>
            </div>
          )}

          {selectedSequence && (
            <>
              <header className="sequence-details__header">
                <div>
                  <h2>{selectedSequence.summary.name}</h2>
                  <div className="sequence-details__meta">
                    {renderSequenceStatus(selectedSequence.summary)}
                    <span>Strefa: {selectedSequence.summary.timezone}</span>
                    <span>
                      Okno wysyłki: {selectedSequence.summary.sendWindowStart} –{' '}
                      {selectedSequence.summary.sendWindowEnd}
                    </span>
                  </div>
                </div>
                <div className="sequence-details__actions">
                  <button className="btn-secondary" onClick={handleOpenEditSequence}>
                    Edytuj sekwencję
                  </button>
                  <button className="btn-primary" onClick={() => setShowStartModal(true)}>
                    Uruchom na kontakcie
                  </button>
                </div>
              </header>

              <div className="sequence-summary-grid">
                <div>
                  <span className="label">Aktywne wykonania</span>
                  <strong>{selectedSequence.summary.executionsActive}</strong>
                </div>
                <div>
                  <span className="label">Zakończone</span>
                  <strong>{selectedSequence.summary.executionsCompleted}</strong>
                </div>
                <div>
                  <span className="label">Zaplanowane maile</span>
                  <strong>{selectedSequence.pendingScheduledEmails}</strong>
                </div>
                <div>
                  <span className="label">Limit dzienny</span>
                  <strong>
                    {selectedSequence.summary.dailySendingLimit
                      ? `${selectedSequence.summary.dailySendingLimit}/dzień`
                      : 'Bez limitu'}
                  </strong>
                </div>
              </div>

              <section className="sequence-steps">
                <div className="sequence-steps__header">
                  <h3>Kroki ({selectedSequence.steps.length})</h3>
                </div>

                {selectedSequence.steps.length === 0 && (
                  <div className="sequence-details__placeholder">
                    <p>Ta sekwencja nie ma jeszcze żadnych kroków.</p>
                  </div>
                )}

                {selectedSequence.steps.map((step, index) => (
                  <article key={step.id || index} className="step-card">
                    <header>
                      <div className="step-index">Krok {step.stepOrder}</div>
                      <div className="step-badges">
                        <span className="badge">{step.stepType}</span>
                        {step.skipIfReplied && <span className="badge badge-outline">Pomijaj po odpowiedzi</span>}
                      </div>
                    </header>
                    <div className="step-content">
                      <div className="step-delay">
                        ⏱️ Wyślij po {step.delayDays} d, {step.delayHours} h, {step.delayMinutes} min
                        {step.waitForReplyHours > 0 && ` (dodatkowo poczekaj ${step.waitForReplyHours}h na odpowiedź)`}
                      </div>
                      <div className="step-subject">
                        <strong>Temat:</strong> {step.subject}
                      </div>
                      <div className="step-body">
                        <strong>Treść:</strong>
                        <p>{step.body}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </>
          )}
        </section>
      </div>

      {/* Sequence modal */}
      {showSequenceModal && (
        <div className="modal-overlay" onClick={() => setShowSequenceModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2>{isEditingSequence ? 'Edytuj sekwencję' : 'Nowa sekwencja'}</h2>
              <button type="button" onClick={() => setShowSequenceModal(false)}>
                ×
              </button>
            </header>
            <form onSubmit={handleSubmitSequence}>
              <section>
                <label>
                  Nazwa*
                  <input
                    type="text"
                    value={sequenceForm.name}
                    onChange={(e) => handleSequenceFormChange('name', e.target.value)}
                    required
                  />
                </label>
                <label>
                  Opis
                  <textarea
                    rows={3}
                    value={sequenceForm.description}
                    onChange={(e) => handleSequenceFormChange('description', e.target.value)}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={sequenceForm.active}
                    onChange={(e) => handleSequenceFormChange('active', e.target.checked)}
                  />
                  Sekwencja aktywna
                </label>
              </section>

              <section className="form-grid">
                <label>
                  Strefa czasowa
                  <select
                    value={sequenceForm.timezone}
                    onChange={(e) => handleSequenceFormChange('timezone', e.target.value)}
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Start okna
                  <input
                    type="time"
                    value={sequenceForm.sendWindowStart}
                    onChange={(e) => handleSequenceFormChange('sendWindowStart', e.target.value)}
                  />
                </label>
                <label>
                  Koniec okna
                  <input
                    type="time"
                    value={sequenceForm.sendWindowEnd}
                    onChange={(e) => handleSequenceFormChange('sendWindowEnd', e.target.value)}
                  />
                </label>
                <label>
                  Limit dzienny
                  <input
                    type="number"
                    min="0"
                    placeholder="np. 100"
                    value={sequenceForm.dailySendingLimit}
                    onChange={(e) => handleSequenceFormChange('dailySendingLimit', e.target.value)}
                  />
                </label>
                <label>
                  Limit na godzinę
                  <input
                    type="number"
                    min="0"
                    placeholder="np. 20"
                    value={sequenceForm.throttlePerHour}
                    onChange={(e) => handleSequenceFormChange('throttlePerHour', e.target.value)}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={sequenceForm.sendOnWeekends}
                    onChange={(e) => handleSequenceFormChange('sendOnWeekends', e.target.checked)}
                  />
                  Wysyłaj w weekendy
                </label>
              </section>

              <section className="steps-builder">
                <div className="steps-builder__header">
                  <h3>Kroki sekwencji</h3>
                  <button type="button" className="btn-secondary" onClick={() => handleOpenStepModal()}>
                    Dodaj krok
                  </button>
                </div>
                {sequenceForm.steps.length === 0 && (
                  <div className="steps-placeholder">Dodaj pierwszy krok, aby rozpocząć automatyzację.</div>
                )}
                {sequenceForm.steps.map((step, index) => (
                  <div key={`${step.stepOrder}-${index}`} className="steps-builder__item">
                    <div>
                      <strong>Krok {step.stepOrder}</strong> • {step.stepType}
                      <p>{step.subject}</p>
                    </div>
                    <div className="steps-builder__actions">
                      <button type="button" onClick={() => handleOpenStepModal(step, index)}>
                        Edytuj
                      </button>
                      <button type="button" onClick={() => handleDeleteLocalStep(index)}>
                        Usuń
                      </button>
                    </div>
                  </div>
                ))}
              </section>

              <footer>
                <button type="button" className="btn-secondary" onClick={() => setShowSequenceModal(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Zapisywanie...' : 'Zapisz sekwencję'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Step modal */}
      {showStepModal && (
        <div className="modal-overlay" onClick={() => setShowStepModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2>{stepIndexEditing !== null ? 'Edytuj krok' : 'Dodaj krok'}</h2>
              <button type="button" onClick={() => setShowStepModal(false)}>
                ×
              </button>
            </header>
            <form onSubmit={handleSubmitStep}>
              <section className="form-grid">
                <label>
                  Kolejność
                  <input
                    type="number"
                    min="1"
                    value={stepForm.stepOrder}
                    onChange={(e) => handleStepFormChange('stepOrder', e.target.value)}
                  />
                </label>
                <label>
                  Typ kroku
                  <select
                    value={stepForm.stepType}
                    onChange={(e) => handleStepFormChange('stepType', e.target.value)}
                  >
                    {stepTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section>
                <label>
                  Temat*
                  <input
                    type="text"
                    value={stepForm.subject}
                    onChange={(e) => handleStepFormChange('subject', e.target.value)}
                    required
                  />
                </label>
                <label>
                  Treść*
                  <textarea
                    rows={6}
                    value={stepForm.body}
                    onChange={(e) => handleStepFormChange('body', e.target.value)}
                    required
                  />
                </label>
              </section>

              <section className="form-grid">
                <label>
                  Opóźnienie (dni)
                  <input
                    type="number"
                    min="0"
                    value={stepForm.delayDays}
                    onChange={(e) => handleStepFormChange('delayDays', e.target.value)}
                  />
                </label>
                <label>
                  Opóźnienie (godz.)
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={stepForm.delayHours}
                    onChange={(e) => handleStepFormChange('delayHours', e.target.value)}
                  />
                </label>
                <label>
                  Opóźnienie (min.)
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={stepForm.delayMinutes}
                    onChange={(e) => handleStepFormChange('delayMinutes', e.target.value)}
                  />
                </label>
                <label>
                  Czekaj na odpowiedź (h)
                  <input
                    type="number"
                    min="0"
                    value={stepForm.waitForReplyHours}
                    onChange={(e) => handleStepFormChange('waitForReplyHours', e.target.value)}
                  />
                </label>
              </section>

              <section className="checkbox-row">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={stepForm.skipIfReplied}
                    onChange={(e) => handleStepFormChange('skipIfReplied', e.target.checked)}
                  />
                  Pomijaj jeśli kontakt już odpowiedział
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={stepForm.trackOpens}
                    onChange={(e) => handleStepFormChange('trackOpens', e.target.checked)}
                  />
                  Śledź otwarcia
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={stepForm.trackClicks}
                    onChange={(e) => handleStepFormChange('trackClicks', e.target.checked)}
                  />
                  Śledź kliknięcia
                </label>
              </section>

              <footer>
                <button type="button" className="btn-secondary" onClick={() => setShowStepModal(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn-primary">
                  Zapisz krok
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Start modal */}
      {showStartModal && (
        <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2>Uruchom sekwencję</h2>
              <button type="button" onClick={() => setShowStartModal(false)}>
                ×
              </button>
            </header>
            <div className="modal-body">
              <label>
                Kontakt
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                >
                  <option value="">— Wybierz kontakt —</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} ({contact.email})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <footer>
              <button type="button" className="btn-secondary" onClick={() => setShowStartModal(false)}>
                Anuluj
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleStartSequence}
                disabled={!selectedContactId || actionLoading}
              >
                {actionLoading ? 'Uruchamiam...' : 'Start'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sequences;
