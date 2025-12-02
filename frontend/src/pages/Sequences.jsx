import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sequencesApi, contactsApi, emailAccountsApi, tagsApi, aiApi } from '../services/api';
import './Sequences.css';

const initialSequenceForm = {
  name: '',
  description: '',
  active: true,
  timezone: 'Europe/Warsaw',
  sendWindowStart: '09:00',
  sendWindowEnd: '17:00',
  sendOnWeekends: false,
  dailySendingLimit: 100,
  throttlePerHour: 20,
  emailAccountId: '',
  tagId: null, // Tag docelowy dla odbiorców (opcjonalny)
  steps: [],
};

const initialStepForm = {
  stepOrder: 1,
  stepType: 'email',
  subject: '',
  body: '',
  delayDays: 0, // Domyślnie wysyłka natychmiast po uruchomieniu
  delayHours: 0,
  delayMinutes: 0,
  waitForReplyHours: 0,
  skipIfReplied: true,
  trackOpens: true,
  trackClicks: true,
};

const Sequences = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Try to restore state from sessionStorage
  const [restoredState, setRestoredState] = React.useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [sequences, setSequences] = useState([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState(null);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [tags, setTags] = useState([]);

  // Form states
  const [sequenceForm, setSequenceForm] = useState(initialSequenceForm);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState(null); // If null -> creating mode, if number -> editing that step card

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // AI states
  const [aiLoading, setAiLoading] = useState({});
  const [aiError, setAiError] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCreateSequenceModal, setShowCreateSequenceModal] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactEmailFilter, setContactEmailFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [excludeInSequence, setExcludeInSequence] = useState(false);
  const [previewStepIndex, setPreviewStepIndex] = useState(0); // Which step to preview

  // AI Modal states
  const [aiModalData, setAiModalData] = useState({
    websiteUrl: '',
    goal: 'meeting',
    additionalContext: ''
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  
  // AI Analysis - wyświetlane w builderze po wygenerowaniu
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiWebsiteUrl, setAiWebsiteUrl] = useState('');
  const [showAIFormInBuilder, setShowAIFormInBuilder] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Restore state from sessionStorage if needed
  useEffect(() => {
    const stored = sessionStorage.getItem('sequenceState');
    if (stored) {
      try {
        const state = JSON.parse(stored);
        setRestoredState(state);
        if (state.contactEmail) {
          setContactEmailFilter(state.contactEmail);
        }
      } catch (e) {
        console.error('Failed to parse stored state:', e);
      }
    }
  }, []);

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem('pendingContactEmail');
    if (pendingEmail && !contactEmailFilter) {
      setContactEmailFilter(pendingEmail);
    }
  }, [contactEmailFilter]);

  // Handle navigation from Deals page
  useEffect(() => {
    if (location.state?.autoOpenCreate && emailAccounts.length > 0) {
      const { dealTitle, dealId, contactEmail } = location.state;

      // Store dealId for later use when starting sequence
      sessionStorage.setItem('pendingDealId', dealId);
      sessionStorage.setItem('pendingContactId', location.state.contactId);
      sessionStorage.setItem('pendingDealTitle', dealTitle);
      if (contactEmail) {
        sessionStorage.setItem('pendingContactEmail', contactEmail);
        setContactEmailFilter(contactEmail);
      }

      // Store the state for AI detection
      const storedState = { fromDeal: true, contactId: location.state.contactId, contactEmail };
      sessionStorage.setItem('sequenceState', JSON.stringify(storedState));

      // Open create sequence modal instead of directly opening builder
      openCreateSequenceModal();

      // Clear navigation state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, emailAccounts, navigate]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        refreshSequences(),
        fetchContacts(),
        fetchEmailAccounts(),
        fetchTags(),
      ]);
    } catch (err) {
      setError('Nie udało się pobrać danych.');
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
      if (sequencesRes.data.length > 0 && !selectedSequenceId) {
        handleSelectSequence(sequencesRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await contactsApi.getAll({ showAll: true });
      setContacts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmailAccounts = async () => {
    try {
      const res = await emailAccountsApi.getAll();
      setEmailAccounts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-ustaw konto wysyłkowe gdy jest dostępne i brak wybranego
  useEffect(() => {
    if (emailAccounts.length > 0 && (!sequenceForm.emailAccountId || sequenceForm.emailAccountId === '')) {
      setSequenceForm(prev => ({
        ...prev,
        emailAccountId: emailAccounts[0]?.id?.toString() || ''
      }));
    }
  }, [emailAccounts]);

  const fetchTags = async () => {
    try {
      const res = await tagsApi.getAll();
      setTags(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectSequence = async (id) => {
    setSelectedSequenceId(id);
    try {
      const res = await sequencesApi.getById(id);
      setSelectedSequence(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Builder Logic ---

  const openBuilder = (sequence = null, aiSteps = null, preFilledForm = null) => {
    if (sequence) {
      setSequenceForm({
        ...sequence.summary,
        steps: sequence.steps.map(s => ({ ...s })), // Deep copy steps
      });
    } else if (preFilledForm) {
      setSequenceForm(preFilledForm);
    } else {
      setSequenceForm({
        ...initialSequenceForm,
        steps: aiSteps || []
      });
    }
    setIsBuilderOpen(true);
    setEditingStepIndex(null);
  };

  const openCreateSequenceModal = () => {
    setShowCreateSequenceModal(true);
    setAiModalData({
      websiteUrl: '',
      goal: 'meeting',
      additionalContext: ''
    });
  };

  const closeCreateSequenceModal = () => {
    setShowCreateSequenceModal(false);
  };

  const createEmptySequence = () => {
    setShowCreateSequenceModal(false);

    // Check if we have pending deal data
    const pendingDealId = sessionStorage.getItem('pendingDealId');
    const pendingDealTitle = sessionStorage.getItem('pendingDealTitle');

    // Pre-fill sequence form if coming from Deals
    let preFilledForm = null;
    if (pendingDealId) {
      preFilledForm = {
        ...initialSequenceForm,
        name: pendingDealTitle ? `Sekwencja: ${pendingDealTitle}` : 'Nowa Sekwencja',
        description: pendingDealTitle ? `Sekwencja dla szansy: ${pendingDealTitle}` : '',
        emailAccountId: emailAccounts[0]?.id?.toString() || '',
        steps: []
      };
    }

    openBuilder(null, null, preFilledForm);
  };

  const closeBuilder = () => {
    if (window.confirm('Czy na pewno chcesz zamknąć kreator? Niezapisane zmiany zostaną utracone.')) {
      setIsBuilderOpen(false);
      setAiAnalysis(null);
      setAiWebsiteUrl('');
    }
  };

  // === AI Functions ===
  const handleAIImprove = async (stepIdx) => {
    const step = sequenceForm.steps[stepIdx];
    if (!step.body || step.body.trim().length < 10) {
      alert('Wpisz najpierw treść wiadomości (min. 10 znaków)');
      return;
    }
    
    setAiLoading(prev => ({ ...prev, [`improve_${stepIdx}`]: true }));
    try {
      const response = await aiApi.improveEmail({
        content: step.body,
        goal: 'sales',
        tone: 'professional'
      });
      updateStep(stepIdx, 'body', response.data.content);
    } catch (err) {
      console.error('AI improve error:', err);
      alert('Błąd AI: ' + (err.response?.data?.message || err.message));
    } finally {
      setAiLoading(prev => ({ ...prev, [`improve_${stepIdx}`]: false }));
    }
  };
  
  const handleAIGenerateSubject = async (stepIdx) => {
    const step = sequenceForm.steps[stepIdx];
    if (!step.body || step.body.trim().length < 10) {
      alert('Wpisz najpierw treść wiadomości');
      return;
    }
    
    setAiLoading(prev => ({ ...prev, [`subject_${stepIdx}`]: true }));
    try {
      const response = await aiApi.generateSubject({
        content: step.body,
        style: 'professional'
      });
      updateStep(stepIdx, 'subject', response.data.subject);
    } catch (err) {
      console.error('AI subject error:', err);
      alert('Błąd AI: ' + (err.response?.data?.message || err.message));
    } finally {
      setAiLoading(prev => ({ ...prev, [`subject_${stepIdx}`]: false }));
    }
  };
  
  const handleAIPersonalize = async (stepIdx) => {
    const step = sequenceForm.steps[stepIdx];
    if (!step.body || step.body.trim().length < 10) {
      alert('Wpisz najpierw treść wiadomości');
      return;
    }
    
    setAiLoading(prev => ({ ...prev, [`personalize_${stepIdx}`]: true }));
    try {
      const response = await aiApi.personalizeContent({
        content: step.body,
        contactName: '{{firstName}}',
        company: '{{company}}',
        position: '{{position}}'
      });
      updateStep(stepIdx, 'body', response.data.content);
    } catch (err) {
      console.error('AI personalize error:', err);
      alert('Błąd AI: ' + (err.response?.data?.message || err.message));
    } finally {
      setAiLoading(prev => ({ ...prev, [`personalize_${stepIdx}`]: false }));
    }
  };

  const addStep = () => {
    const newStep = {
      ...initialStepForm,
      stepOrder: sequenceForm.steps.length + 1,
    };
    setSequenceForm(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    // Automatically open edit for the new step
    setEditingStepIndex(sequenceForm.steps.length);
  };

  const generateAISequence = async () => {
    if (!aiModalData.websiteUrl) {
      alert('Podaj URL strony klienta');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-sequence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          websiteUrl: aiModalData.websiteUrl,
          goal: aiModalData.goal,
          additionalContext: aiModalData.additionalContext
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiData = await response.json();

      if (aiData.emails && aiData.emails.length > 0) {
        // Konwertuj emaile AI na kroki sekwencji
        const aiSteps = aiData.emails.map((email, index) => ({
          stepOrder: index + 1,
          stepType: 'email',
          subject: email.subject,
          body: email.body,
          delayDays: Math.floor(email.delay_in_days || 0),
          delayHours: 0,
          delayMinutes: 0,
          waitForReplyHours: index < aiData.emails.length - 1 ? 48 : 0,
          skipIfReplied: index > 0,
          trackOpens: true,
          trackClicks: true
        }));

        // Zamknij modal AI i otwórz builder z wygenerowanymi krokami
        setShowCreateSequenceModal(false);

        // Check if we have pending deal data and create pre-filled form
        const pendingDealId = sessionStorage.getItem('pendingDealId');
        const pendingDealTitle = sessionStorage.getItem('pendingDealTitle');

        // Zapisz analizę AI
        setAiAnalysis(aiData.analysis || null);
        setAiWebsiteUrl(aiModalData.websiteUrl);

        // ZAWSZE dodaj kroki AI do formularza
        const preFilledForm = {
          ...initialSequenceForm,
          name: aiData.suggestedSequenceName || (pendingDealTitle ? `Sekwencja: ${pendingDealTitle}` : 'Nowa Sekwencja AI'),
          description: aiData.analysis || (pendingDealTitle ? `Sekwencja AI dla szansy: ${pendingDealTitle}` : 'Wygenerowana sekwencja AI'),
          emailAccountId: emailAccounts[0]?.id?.toString() || '',
          steps: aiSteps // KROKI AI ZAWSZE DOŁĄCZONE
        };

        openBuilder(null, null, preFilledForm);

        alert('✅ Wygenerowano ' + aiData.emails.length + ' kroków sekwencji!');
      } else {
        alert('Nie udało się wygenerować sekwencji. Spróbuj ponownie.');
      }
    } catch (error) {
      console.error('Error generating AI sequence:', error);
      alert('❌ Błąd generowania sekwencji AI: ' + error.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const generateAIStepsInBuilder = async () => {
    if (!aiModalData.websiteUrl) {
      alert('Podaj URL strony klienta');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-sequence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          websiteUrl: aiModalData.websiteUrl,
          goal: aiModalData.goal,
          additionalContext: aiModalData.additionalContext
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiData = await response.json();

      if (aiData.emails && aiData.emails.length > 0) {
        // Konwertuj emaile AI na kroki sekwencji
        const aiSteps = aiData.emails.map((email, index) => ({
          stepOrder: sequenceForm.steps.length + index + 1,
          stepType: 'email',
          subject: email.subject,
          body: email.body,
          delayDays: Math.floor(email.delay_in_days || 0),
          delayHours: 0,
          delayMinutes: 0,
          waitForReplyHours: index < aiData.emails.length - 1 ? 48 : 0,
          skipIfReplied: index > 0,
          trackOpens: true,
          trackClicks: true
        }));

        // Zapisz analizę AI
        setAiAnalysis(aiData.analysis || null);
        setAiWebsiteUrl(aiModalData.websiteUrl);

        // Dodaj kroki AI do istniejących kroków
        setSequenceForm(prev => ({
          ...prev,
          steps: [...prev.steps, ...aiSteps]
        }));

        // Zamknij formularz AI w builderze
        setShowAIFormInBuilder(false);

        alert('✅ Dodano ' + aiData.emails.length + ' kroków AI do sekwencji!');
      } else {
        alert('Nie udało się wygenerować kroków. Spróbuj ponownie.');
      }
    } catch (error) {
      console.error('Error generating AI steps:', error);
      alert('❌ Błąd generowania kroków AI: ' + error.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const generateAISteps = async () => {
    const contactId = location.state?.contactId || restoredState?.contactId;
    const fromDeal = location.state?.fromDeal || restoredState?.fromDeal;

    if (!fromDeal || !contactId) {
      alert('Brak danych o kontakcie do wygenerowania sekwencji');
      return;
    }

    setActionLoading(true);
    try {
      // Pobierz dane kontaktu
      const contactResponse = await fetch(`/api/contacts/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const contact = await contactResponse.json();

      // Wygeneruj sekwencję AI
      const aiResponse = await fetch('/api/ai/generate-sequence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          dealId: sessionStorage.getItem('pendingDealId') || location.state?.dealId,
          websiteUrl: contact.company ? `https://${contact.company.toLowerCase().replace(/\s+/g, '')}.pl` : '',
          additionalContext: '',
          goal: 'meeting' // Domyślny cel
        })
      });

      const aiData = await aiResponse.json();

      if (aiData.emails && aiData.emails.length > 0) {
        // Konwertuj emaile AI na kroki sekwencji
        const aiSteps = aiData.emails.map((email, index) => ({
          stepOrder: index + 1,
          stepType: 'email',
          subject: email.subject,
          body: email.body,
          delayDays: Math.floor(email.delayHours / 24),
          delayHours: email.delayHours % 24,
          delayMinutes: 0,
          waitForReplyHours: index < aiData.emails.length - 1 ? 48 : 0, // Czekaj na odpowiedź
          skipIfReplied: index > 0, // Pomijaj jeśli odpowiedziano
          trackOpens: true,
          trackClicks: true
        }));

        // Dodaj kroki AI do sekwencji
        setSequenceForm(prev => ({
          ...prev,
          steps: [...prev.steps, ...aiSteps]
        }));

        alert('✅ Wygenerowano ' + aiData.emails.length + ' kroków sekwencji!');
      }
    } catch (error) {
      console.error('Error generating AI sequence:', error);
      alert('❌ Błąd generowania sekwencji AI');
    } finally {
      setActionLoading(false);
    }
  };

  const updateStep = (index, field, value) => {
    setSequenceForm(prev => {
      const newSteps = [...prev.steps];
      newSteps[index] = { ...newSteps[index], [field]: value };
      return { ...prev, steps: newSteps };
    });
  };

  const removeStep = (index) => {
    setSequenceForm(prev => {
      const newSteps = prev.steps.filter((_, i) => i !== index);
      // Reorder remaining steps
      const reordered = newSteps.map((s, i) => ({ ...s, stepOrder: i + 1 }));
      return { ...prev, steps: reordered };
    });
    if (editingStepIndex === index) setEditingStepIndex(null);
  };

  const processTemplatePreview = (text, sampleContact) => {
    if (!text || !sampleContact) return text;

    let result = text;

    // {{name}}
    if (sampleContact.name) {
      result = result.replace(/\{\{name\}\}/g, sampleContact.name);

      // {{firstName}} and {{lastName}}
      const nameParts = sampleContact.name.trim().split(/\s+/);
      if (nameParts.length > 0) {
        result = result.replace(/\{\{firstName\}\}/g, nameParts[0]);
      }
      if (nameParts.length > 1) {
        result = result.replace(/\{\{lastName\}\}/g, nameParts[nameParts.length - 1]);
      }
    }

    // {{email}}
    if (sampleContact.email) {
      result = result.replace(/\{\{email\}\}/g, sampleContact.email);
    }

    // {{phone}}
    if (sampleContact.phone) {
      result = result.replace(/\{\{phone\}\}/g, sampleContact.phone);
    }

    // {{company}}
    if (sampleContact.company) {
      result = result.replace(/\{\{company\}\}/g, sampleContact.company);
    }

    // {{position}}
    if (sampleContact.position) {
      result = result.replace(/\{\{position\}\}/g, sampleContact.position);
    }

    // Highlight remaining unprocessed variables
    result = result.replace(/\{\{(\w+)\}\}/g, '<span style="background: #fef3c7; color: #92400e; padding: 2px 4px; border-radius: 3px;">{{$1}}</span>');

    return result;
  };

  const getSampleContact = () => {
    // Use first contact with complete data, or create a sample
    const completeContact = contacts.find(c => c.name && c.email && c.company);
    if (completeContact) return completeContact;

    // Fallback sample data
    return {
      name: 'Jan Kowalski',
      email: 'jan.kowalski@example.com',
      phone: '+48 123 456 789',
      company: 'Example Corp',
      position: 'Dyrektor Sprzedaży'
    };
  };

  const validateSequence = () => {
    // Validate name
    if (!sequenceForm.name || sequenceForm.name.trim().length === 0) {
      return 'Nazwa sekwencji jest wymagana.';
    }
    if (sequenceForm.name.length > 100) {
      return 'Nazwa sekwencji nie może być dłuższa niż 100 znaków.';
    }

    // Validate send window
    if (sequenceForm.sendWindowStart && sequenceForm.sendWindowEnd) {
      if (sequenceForm.sendWindowEnd <= sequenceForm.sendWindowStart) {
        return 'Czas zakończenia okna wysyłki musi być późniejszy niż czas rozpoczęcia.';
      }
    }

    // Validate daily sending limit
    const dailyLimit = Number(sequenceForm.dailySendingLimit);
    if (isNaN(dailyLimit) || dailyLimit < 1 || dailyLimit > 10000) {
      return 'Dzienny limit wysyłki musi być liczbą z zakresu 1-10000.';
    }

    // Validate throttle per hour
    const throttle = Number(sequenceForm.throttlePerHour);
    if (isNaN(throttle) || throttle < 1 || throttle > 1000) {
      return 'Limit wysyłki na godzinę musi być liczbą z zakresu 1-1000.';
    }

    // Validate email account
    if (!sequenceForm.emailAccountId) {
      return 'Wybierz konto email do wysyłki.';
    }

    // Validate steps
    if (sequenceForm.steps.length === 0) {
      return 'Dodaj przynajmniej jeden krok do sekwencji.';
    }

    for (let i = 0; i < sequenceForm.steps.length; i++) {
      const step = sequenceForm.steps[i];

      // Validate step type
      if (!step.stepType || step.stepType.trim().length === 0) {
        return `Krok ${i + 1}: Typ kroku jest wymagany.`;
      }

      // Validate subject
      if (!step.subject || step.subject.trim().length === 0) {
        return `Krok ${i + 1}: Temat wiadomości jest wymagany.`;
      }
      if (step.subject.length > 500) {
        return `Krok ${i + 1}: Temat wiadomości nie może być dłuższy niż 500 znaków.`;
      }

      // Validate body
      if (!step.body || step.body.trim().length === 0) {
        return `Krok ${i + 1}: Treść wiadomości jest wymagana.`;
      }
      if (step.body.length > 10000) {
        return `Krok ${i + 1}: Treść wiadomości nie może być dłuższa niż 10000 znaków.`;
      }

      // Validate delays
      const delayDays = Number(step.delayDays);
      const delayHours = Number(step.delayHours);
      const delayMinutes = Number(step.delayMinutes);

      if (isNaN(delayDays) || delayDays < 0 || delayDays > 365) {
        return `Krok ${i + 1}: Opóźnienie w dniach musi być liczbą z zakresu 0-365.`;
      }
      if (isNaN(delayHours) || delayHours < 0 || delayHours > 23) {
        return `Krok ${i + 1}: Opóźnienie w godzinach musi być liczbą z zakresu 0-23.`;
      }
      if (isNaN(delayMinutes) || delayMinutes < 0 || delayMinutes > 59) {
        return `Krok ${i + 1}: Opóźnienie w minutach musi być liczbą z zakresu 0-59.`;
      }

      // Validate wait for reply
      const waitForReplyHours = Number(step.waitForReplyHours);
      if (isNaN(waitForReplyHours) || waitForReplyHours < 0 || waitForReplyHours > 720) {
        return `Krok ${i + 1}: Czas oczekiwania na odpowiedź musi być liczbą z zakresu 0-720 godzin.`;
      }
    }

    return null; // No errors
  };

  const saveSequence = async () => {
    // Validate form
    const validationError = validateSequence();
    if (validationError) {
      alert(validationError);
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...sequenceForm,
        dailySendingLimit: Number(sequenceForm.dailySendingLimit),
        throttlePerHour: Number(sequenceForm.throttlePerHour),
        emailAccountId: sequenceForm.emailAccountId ? Number(sequenceForm.emailAccountId) : null,
        tagId: sequenceForm.tagId ? Number(sequenceForm.tagId) : null,
      };

      let createdSequenceId = null;

      if (sequenceForm.id) {
        console.log('Updating existing sequence:', sequenceForm.id);
        await sequencesApi.update(sequenceForm.id, payload);
      } else {
        console.log('Creating new sequence with payload:', payload);
        try {
          const response = await sequencesApi.create(payload);
          console.log('Create response:', response);
          console.log('Response data:', response.data);
          console.log('Response data summary:', response.data.summary);
          createdSequenceId = response.data.summary.id;
          console.log('Set createdSequenceId to:', createdSequenceId);
        } catch (createErr) {
          console.error('Error creating sequence:', createErr);
          throw createErr;
        }
      }

      await refreshSequences();
      setIsBuilderOpen(false);

      // If sequence was created from a Deal, auto-start it for the contact
      const pendingDealId = sessionStorage.getItem('pendingDealId');
      const pendingContactId = sessionStorage.getItem('pendingContactId');

      console.log('=== SEQUENCE SAVE DEBUG ===');
      console.log('Created sequence ID:', createdSequenceId);
      console.log('Pending dealId:', pendingDealId);
      console.log('Pending contactId:', pendingContactId);
      console.log('SessionStorage content:');
      console.log('- pendingDealId:', sessionStorage.getItem('pendingDealId'));
      console.log('- pendingContactId:', sessionStorage.getItem('pendingContactId'));
      console.log('- pendingDealTitle:', sessionStorage.getItem('pendingDealTitle'));

      if (createdSequenceId && pendingDealId && pendingContactId) {
        console.log('=== STARTING SEQUENCE ===');
        console.log('Starting sequence for contact:', pendingContactId, 'deal:', pendingDealId);
        try {
          // Start sequence for the contact with dealId
          await sequencesApi.startSequence(
            createdSequenceId,
            Number(pendingContactId),
            Number(pendingDealId)
          );

          // Clear pending data
          sessionStorage.removeItem('pendingDealId');
          sessionStorage.removeItem('pendingContactId');
          sessionStorage.removeItem('pendingDealTitle');

          alert('Sekwencja została utworzona i uruchomiona! Szansa została przeniesiona do następnego etapu.');

          // Navigate back to deals
          navigate('/deals');
        } catch (startErr) {
          console.error('Failed to start sequence:', startErr);
          alert('Sekwencja została utworzona, ale nie udało się jej uruchomić: ' + (startErr.response?.data?.message || startErr.message));
        }
      } else {
        console.log('=== NOT STARTING SEQUENCE ===');
        console.log('Missing data:');
        console.log('- createdSequenceId exists:', !!createdSequenceId);
        console.log('- pendingDealId exists:', !!pendingDealId);
        console.log('- pendingContactId exists:', !!pendingContactId);
        console.log('This likely means the sequence was not created from a Deal or sessionStorage was cleared.');
      }
    } catch (err) {
      alert('Błąd zapisu: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // --- Render Helpers ---

  const renderMetrics = () => {
    if (!dashboard) return null;
    return (
      <div className="sequences-metrics">
        <div className="metric-tile positive">
          <span className="metric-label">Aktywne Sekwencje</span>
          <span className="metric-value">{dashboard.activeSequences}</span>
        </div>
        <div className="metric-tile primary">
          <span className="metric-label">Aktywne Wykonania</span>
          <span className="metric-value">{dashboard.activeExecutions}</span>
        </div>
        <div className="metric-tile warning">
          <span className="metric-label">Oczekujące Maile</span>
          <span className="metric-value">{dashboard.pendingScheduledEmails}</span>
        </div>
      </div>
    );
  };

  const renderTimeline = (steps, readOnly = false) => (
    <div className="enhanced-timeline">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          {/* Delay Indicator Between Steps */}
          {idx > 0 && (
            <div className="timeline-delay-indicator">
              <div className="timeline-connector">
                <div className="connector-line"></div>
                <div className="connector-icon">⏱️</div>
              </div>
              <div className="delay-badge">
                {step.delayDays > 0 && <span>{step.delayDays} {step.delayDays === 1 ? 'dzień' : 'dni'}</span>}
                {step.delayHours > 0 && <span>{step.delayHours} {step.delayHours === 1 ? 'godz' : 'godz'}</span>}
                {step.delayMinutes > 0 && <span>{step.delayMinutes} min</span>}
                {step.delayDays === 0 && step.delayHours === 0 && step.delayMinutes === 0 && <span>natychmiast</span>}
              </div>
            </div>
          )}

          {/* Step Card */}
          <div className="enhanced-timeline-step">
            <div className="step-number-badge">
              <div className="step-number">{idx + 1}</div>
            </div>
            <div className="enhanced-step-card">
              <div className="enhanced-step-header">
                <div className="step-type-badge">
                  📧 Email
                </div>
                <div className="step-subject">
                  {step.subject || '(Bez tematu)'}
                </div>
              </div>
              <div className="enhanced-step-body">
                {step.body ? (
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {step.body.length > 200 ? step.body.substring(0, 200) + '...' : step.body}
                  </div>
                ) : (
                  <em style={{ color: '#9ca3af' }}>Brak treści wiadomości...</em>
                )}
              </div>
              <div className="enhanced-step-meta">
                {step.trackOpens && (
                  <span className="meta-badge">
                    <span style={{ fontSize: '14px' }}>👁️</span> Śledzenie otwarć
                  </span>
                )}
                {step.trackClicks && (
                  <span className="meta-badge">
                    <span style={{ fontSize: '14px' }}>🖱️</span> Śledzenie kliknięć
                  </span>
                )}
                {step.skipIfReplied && (
                  <span className="meta-badge">
                    <span style={{ fontSize: '14px' }}>↩️</span> Pomiń jeśli odpowiedział
                  </span>
                )}
              </div>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <>
      {/* --- Main View --- */}
      {!isBuilderOpen && (
        <div className="sequences-shell">
          {/* Topbar */}
          <div className="sequences-topbar">
            <div>
              <h1>Kampanie Drip</h1>
              <p className="sequences-sub">Planuj automatyczne sekwencje maili i follow-upów.</p>
            </div>
            <div className="sequences-topbar-actions">
              <button className="btn btn-secondary" onClick={() => refreshSequences()}>
                🔄 Odśwież
              </button>
              <button className="btn btn-primary" onClick={openCreateSequenceModal}>
                + Nowa Sekwencja
              </button>
            </div>
          </div>

          {/* Main Dashboard Layout - matching Dashboard page */}
          <div className="container" style={{ paddingTop: '24px' }}>
            {renderMetrics()}

            <div className="sequences-main-layout">
              {/* Left Sidebar - Sequences List */}
              <div className="sequences-list-section">
                <div className="sequences-list-header">
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                    Twoje Kampanie
                  </h3>
                </div>
                <div className="sequences-list-content">
                  <div className="sequence-list">
                    {sequences.map(seq => (
                      <div
                        key={seq.id}
                        className={`sequence-tile ${selectedSequenceId === seq.id ? 'selected' : ''}`}
                        onClick={() => handleSelectSequence(seq.id)}
                      >
                        <div className="sequence-tile__header">
                          <h3>{seq.name}</h3>
                          <span className={`sequence-status ${seq.active ? 'active' : 'inactive'}`}>
                            {seq.active ? 'Aktywna' : 'Pauza'}
                          </span>
                        </div>
                        <p>{seq.description || 'Brak opisu'}</p>
                        <div className="sequence-tile__footer">
                          <span>📬 Kroki: {seq.stepsCount}</span>
                          <button onClick={(e) => { e.stopPropagation(); sequencesApi.delete(seq.id).then(refreshSequences); }}>
                            Usuń
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            {/* Main Content - Sequence Details */}
              <section className="sequences-center">
                {selectedSequence ? (
                  <div>
                    {/* Toolbar */}
                    <div className="sequences-toolbar">
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                          {selectedSequence.summary.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>
                          <span>🌍 {selectedSequence.summary.timezone}</span>
                          <span>🕒 {selectedSequence.summary.sendWindowStart} - {selectedSequence.summary.sendWindowEnd}</span>
                          <span>📊 Limit: {selectedSequence.summary.dailySendingLimit}/dzień</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-secondary" onClick={() => openBuilder(selectedSequence)}>
                          ✏️ Edytuj
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowStartModal(true)}>
                          ▶️ Uruchom
                        </button>
                      </div>
                    </div>

                    {/* Timeline Content */}
                    <div className="sequences-content">
                      <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                        Ścieżka kontaktu
                      </h4>
                      {selectedSequence.steps.length > 0 ? (
                        renderTimeline(selectedSequence.steps, true)
                      ) : (
                        <div style={{
                          padding: '40px',
                          textAlign: 'center',
                          color: '#9ca3af',
                          border: '2px dashed #e5e7eb',
                          borderRadius: '16px',
                          background: '#f9fafb'
                        }}>
                          <div style={{ fontSize: '24px', marginBottom: '12px' }}>📭</div>
                          Brak kroków w tej sekwencji.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '48px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#6b7280' }}>
                      Wybierz sekwencję z listy
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      aby zobaczyć szczegóły i zarządzać kampanią.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* --- Builder Modal (Full Screen) --- */}
      {isBuilderOpen && (
        <div className="builder-modal">
          <header className="builder-header">
            <h2>{sequenceForm.id ? 'Edycja Sekwencji' : 'Kreator Sekwencji'}</h2>
            <div className="builder-actions">
              <button className="btn-secondary" onClick={closeBuilder}>Anuluj</button>
              <button className="btn-primary" onClick={saveSequence} disabled={actionLoading}>
                {actionLoading ? 'Zapisywanie...' : 'Zapisz Zmiany'}
              </button>
            </div>
          </header>

          <div className="builder-content-with-preview">
            {/* Left Sidebar: Settings */}
            <aside className="builder-sidebar">
              <h3>Ustawienia Główne</h3>
              
              {/* Panel analizy AI - wyświetlany po wygenerowaniu sekwencji */}
              {aiAnalysis && (
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <span style={{ fontSize: '20px' }}>🤖</span>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>Analiza AI</span>
                    <button 
                      onClick={() => setAiAnalysis(null)}
                      style={{
                        marginLeft: 'auto',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '14px'
                      }}
                      title="Zamknij"
                    >×</button>
                  </div>
                  
                  {aiWebsiteUrl && (
                    <div style={{
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '12px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>🔗</span>
                      <a 
                        href={aiWebsiteUrl.startsWith('http') ? aiWebsiteUrl : `https://${aiWebsiteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'white', textDecoration: 'underline' }}
                      >
                        {aiWebsiteUrl}
                      </a>
                    </div>
                  )}
                  
                  <div style={{
                    fontSize: '13px',
                    lineHeight: '1.6',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>Co udało się ustalić:</strong>
                    {aiAnalysis}
                  </div>
                </div>
              )}

              {/* Przycisk do generowania AI w builderze */}
              {!showAIFormInBuilder && (
                <button
                  onClick={() => setShowAIFormInBuilder(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🤖</span>
                  Wygeneruj kroki AI
                </button>
              )}

              {/* Formularz AI w builderze */}
              {showAIFormInBuilder && (
                <div style={{
                  padding: '20px',
                  marginBottom: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '2px solid #667eea'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🤖</span> Generator AI
                    </h4>
                    <button
                      onClick={() => setShowAIFormInBuilder(false)}
                      style={{
                        background: 'rgba(0,0,0,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        color: '#64748b'
                      }}
                      title="Zamknij"
                    >×</button>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Link do strony klienta*
                    </label>
                    <input
                      type="url"
                      placeholder="https://klient.pl"
                      value={aiModalData.websiteUrl}
                      onChange={e => setAiModalData({ ...aiModalData, websiteUrl: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      AI przeanalizuje stronę i wygeneruje treść wiadomości
                    </small>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Cel sekwencji
                    </label>
                    <select
                      value={aiModalData.goal}
                      onChange={e => setAiModalData({ ...aiModalData, goal: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#fff'
                      }}
                    >
                      <option value="meeting">Doprowadź do spotkania</option>
                      <option value="discovery">Zbadaj potrzebę (Discovery)</option>
                      <option value="sale">Złóż ofertę</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Dodatkowy kontekst (opcjonalny)
                    </label>
                    <textarea
                      placeholder="np. Spotkaliśmy się na targach, byli zainteresowani..."
                      value={aiModalData.additionalContext}
                      onChange={e => setAiModalData({ ...aiModalData, additionalContext: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setShowAIFormInBuilder(false)}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        color: '#374151'
                      }}
                      disabled={aiGenerating}
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={generateAIStepsInBuilder}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                      disabled={aiGenerating || !aiModalData.websiteUrl}
                    >
                      {aiGenerating ? '⚡ Generuję...' : '🤖 Wygeneruj kroki'}
                    </button>
                  </div>
                </div>
              )}

              <div className="builder-form-group">
                <label>Nazwa Kampanii</label>
                <input
                  value={sequenceForm.name}
                  onChange={e => setSequenceForm({ ...sequenceForm, name: e.target.value })}
                  placeholder="np. Cold Mailing Q1"
                  maxLength={100}
                />
                <small style={{ color: '#64748b', fontSize: '11px' }}>
                  {sequenceForm.name.length}/100 znaków
                </small>
              </div>
              <div className="builder-form-group">
                <label>Konto Email (Wysyłkowe)</label>
                <select
                  value={sequenceForm.emailAccountId || ''}
                  onChange={e => setSequenceForm({ ...sequenceForm, emailAccountId: e.target.value })}
                >
                  <option value="">-- Wybierz konto --</option>
                  {emailAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.emailAddress} ({acc.displayName})</option>
                  ))}
                </select>
                {(!emailAccounts || emailAccounts.length === 0) && (
                  <small style={{ color: '#dc2626', fontSize: '12px' }}>
                    Brak skonfigurowanych kont email — dodaj konto, aby wysłać sekwencję.
                  </small>
                )}
              </div>
              <div className="builder-form-group">
                <label>Tag Docelowy (Odbiorcy) — opcjonalne</label>
                <select
                  value={sequenceForm.tagId || ''}
                  onChange={e => setSequenceForm({ ...sequenceForm, tagId: e.target.value || null })}
                >
                  <option value="">-- Wszyscy kontakty --</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#64748b', fontSize: '12px' }}>
                  Pozostaw puste, aby wysłać do wskazanych kontaktów niezależnie od tagu
                </small>
              </div>
              <div className="builder-form-group">
                <label>Strefa Czasowa</label>
                <select
                  value={sequenceForm.timezone}
                  onChange={e => setSequenceForm({ ...sequenceForm, timezone: e.target.value })}
                >
                  <option value="Europe/Warsaw">Europe/Warsaw</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New York</option>
                </select>
              </div>
              <div className="builder-form-group">
                <label>Okno wysyłki</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="time" value={sequenceForm.sendWindowStart} onChange={e => setSequenceForm({ ...sequenceForm, sendWindowStart: e.target.value })} />
                  <input type="time" value={sequenceForm.sendWindowEnd} onChange={e => setSequenceForm({ ...sequenceForm, sendWindowEnd: e.target.value })} />
                </div>
              </div>
              <div className="builder-form-group">
                <label>Dzienny limit wysyłki</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  placeholder="Dzienny limit (np. 50)"
                  value={sequenceForm.dailySendingLimit}
                  onChange={e => setSequenceForm({ ...sequenceForm, dailySendingLimit: e.target.value })}
                />
                <small style={{ color: '#64748b', fontSize: '11px' }}>
                  Zakres: 1-10000 maili dziennie
                </small>
              </div>
              <div className="builder-form-group">
                <label>Limit na godzinę</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="Maili na godzinę (np. 20)"
                  value={sequenceForm.throttlePerHour}
                  onChange={e => setSequenceForm({ ...sequenceForm, throttlePerHour: e.target.value })}
                />
                <small style={{ color: '#64748b', fontSize: '11px' }}>
                  Zakres: 1-1000 maili na godzinę
                </small>
              </div>
              <div className="builder-form-group">
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={sequenceForm.active}
                    onChange={e => setSequenceForm({ ...sequenceForm, active: e.target.checked })}
                  />
                  Kampania aktywna
                </label>
              </div>
            </aside>

            {/* Main Canvas: Visual Builder */}
            <main className="builder-canvas">
              {sequenceForm.steps.map((step, idx) => (
                <div key={idx} className="builder-step">
                  <div className="builder-step-header">
                    <div className="delay-selector">
                      <span>⏳ Czekaj</span>
                      <input
                        type="number"
                        min="0"
                        style={{ width: '40px', textAlign: 'center' }}
                        value={step.delayDays}
                        onChange={e => updateStep(idx, 'delayDays', parseInt(e.target.value) || 0)}
                      />
                      <span>dni od poprzedniego kroku</span>
                    </div>
                    <button className="btn-danger" onClick={() => removeStep(idx)}>Usuń</button>
                  </div>
                  
                  <div className="builder-step-content">
                    <div className="step-editor">
                      <input
                        className="builder-form-group"
                        style={{ fontWeight: 'bold', fontSize: '16px', padding: '8px', width: '100%', border: 'none', borderBottom: '1px solid #e5e7eb' }}
                        placeholder="Temat wiadomości..."
                        value={step.subject}
                        onChange={e => updateStep(idx, 'subject', e.target.value)}
                      />
                      <textarea
                        rows={6}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', fontFamily: 'inherit' }}
                        placeholder="Treść wiadomości... Użyj zmiennych np. {{name}}"
                        value={step.body}
                        onChange={e => updateStep(idx, 'body', e.target.value)}
                      />

                      {/* AI Action Buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <button
                          type="button"
                          onClick={() => handleAIImprove(idx)}
                          disabled={aiLoading[`improve_${idx}`]}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            cursor: aiLoading[`improve_${idx}`] ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            opacity: aiLoading[`improve_${idx}`] ? 0.7 : 1
                          }}
                        >
                          <span>✨</span> {aiLoading[`improve_${idx}`] ? 'Ulepszam...' : 'Ulepsz AI'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleAIGenerateSubject(idx)}
                          disabled={aiLoading[`subject_${idx}`]}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white',
                            cursor: aiLoading[`subject_${idx}`] ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            opacity: aiLoading[`subject_${idx}`] ? 0.7 : 1
                          }}
                        >
                          <span>📝</span> {aiLoading[`subject_${idx}`] ? 'Generuję...' : 'Generuj temat'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleAIPersonalize(idx)}
                          disabled={aiLoading[`personalize_${idx}`]}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            color: 'white',
                            cursor: aiLoading[`personalize_${idx}`] ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            opacity: aiLoading[`personalize_${idx}`] ? 0.7 : 1
                          }}
                        >
                          <span>👤</span> {aiLoading[`personalize_${idx}`] ? 'Personalizuję...' : 'Personalizuj'}
                        </button>
                      </div>

                      {/* Placeholder Help Panel */}
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px', color: '#374151' }}>
                          💡 Dostępne zmienne:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                          <div style={{
                            padding: '6px 10px',
                            backgroundColor: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => {
                            const newBody = step.body + '{{name}}';
                            updateStep(idx, 'body', newBody);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                          title="Kliknij aby wstawić">
                            <code style={{ color: '#059669', fontWeight: '600' }}>{'{{name}}'}</code>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Pełne imię</div>
                          </div>
                          <div style={{
                            padding: '6px 10px',
                            backgroundColor: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => {
                            const newBody = step.body + '{{firstName}}';
                            updateStep(idx, 'body', newBody);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                          title="Kliknij aby wstawić">
                            <code style={{ color: '#059669', fontWeight: '600' }}>{'{{firstName}}'}</code>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Imię</div>
                          </div>
                          <div style={{
                            padding: '6px 10px',
                            backgroundColor: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => {
                            const newBody = step.body + '{{company}}';
                            updateStep(idx, 'body', newBody);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                          title="Kliknij aby wstawić">
                            <code style={{ color: '#059669', fontWeight: '600' }}>{'{{company}}'}</code>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Firma</div>
                          </div>
                          <div style={{
                            padding: '6px 10px',
                            backgroundColor: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => {
                            const newBody = step.body + '{{position}}';
                            updateStep(idx, 'body', newBody);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                          title="Kliknij aby wstawić">
                            <code style={{ color: '#059669', fontWeight: '600' }}>{'{{position}}'}</code>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Stanowisko</div>
                          </div>
                          <div style={{
                            padding: '6px 10px',
                            backgroundColor: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => {
                            const newBody = step.body + '{{email}}';
                            updateStep(idx, 'body', newBody);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                          title="Kliknij aby wstawić">
                            <code style={{ color: '#059669', fontWeight: '600' }}>{'{{email}}'}</code>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Email</div>
                          </div>
                          <div style={{
                            padding: '6px 10px',
                            backgroundColor: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => {
                            const newBody = step.body + '{{phone}}';
                            updateStep(idx, 'body', newBody);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                          title="Kliknij aby wstawić">
                            <code style={{ color: '#059669', fontWeight: '600' }}>{'{{phone}}'}</code>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Telefon</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <label><input type="checkbox" checked={step.trackOpens} onChange={e => updateStep(idx, 'trackOpens', e.target.checked)} /> Śledź otwarcia</label>
                        <label><input type="checkbox" checked={step.trackClicks} onChange={e => updateStep(idx, 'trackClicks', e.target.checked)} /> Śledź kliknięcia</label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* AI Empty State when coming from Deals */}
              {sequenceForm.steps.length === 0 && (location.state?.fromDeal || restoredState?.fromDeal) && (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #f0f1ff 0%, #f5f3ff 100%)',
                  borderRadius: '12px',
                  border: '2px dashed #667eea',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                  <h3 style={{ margin: '0 0 8px', color: '#667eea' }}>Sekwencja AI</h3>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                    Kliknij przycisk poniżej, aby wygenerować automatyczną sekwencję<br/>
                    dopasowaną do tej szansy sprzedażowej
                  </p>
                </div>
              )}

              {/* Smart Add Step Button - AI first if from Deals */}
              {(location.state?.fromDeal || restoredState?.fromDeal) && sequenceForm.steps.length === 0 ? (
                <button
                  className="timeline-add-btn ai-generate-btn"
                  onClick={generateAISteps}
                  disabled={actionLoading}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    fontSize: '14px',
                    padding: '12px 20px'
                  }}
                >
                  <span>🤖</span> {actionLoading ? 'Generuję sekwencję AI...' : 'Generuj sekwencję AI'}
                </button>
              ) : (
                <button
                  className="timeline-add-btn"
                  onClick={() => (location.state?.fromDeal || restoredState?.fromDeal) && sequenceForm.steps.length === 0 ? generateAISteps() : addStep()}
                  style={(location.state?.fromDeal || restoredState?.fromDeal) && sequenceForm.steps.length === 0 ? {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none'
                  } : {}}
                >
                  {(location.state?.fromDeal || restoredState?.fromDeal) && sequenceForm.steps.length === 0 ? (
                    <>
                      <span>🤖</span> {actionLoading ? 'Generuję...' : 'Generuj sekwencję AI'}
                    </>
                  ) : (
                    <>
                      <span>➕</span> Dodaj kolejny krok (E-mail)
                    </>
                  )}
                </button>
              )}
            </main>

            {/* Right Sidebar: Preview */}
            <aside className="builder-preview">
              <div className="preview-header">
                <h3>📧 Podgląd na żywo</h3>
                <select
                  value={previewStepIndex}
                  onChange={e => setPreviewStepIndex(Number(e.target.value))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px'
                  }}
                >
                  {sequenceForm.steps.map((step, idx) => (
                    <option key={idx} value={idx}>Krok {idx + 1}</option>
                  ))}
                  {sequenceForm.steps.length === 0 && <option value={0}>Brak kroków</option>}
                </select>
              </div>

              {sequenceForm.steps.length > 0 && sequenceForm.steps[previewStepIndex] ? (
                <div className="preview-content">
                  <div className="preview-sample-info">
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                      Przykładowy kontakt: <strong>{getSampleContact().name}</strong>
                    </div>
                  </div>

                  <div className="preview-email">
                    <div className="preview-email-header">
                      <div className="preview-label">Temat:</div>
                      <div
                        className="preview-subject"
                        dangerouslySetInnerHTML={{
                          __html: processTemplatePreview(
                            sequenceForm.steps[previewStepIndex].subject || '(Brak tematu)',
                            getSampleContact()
                          )
                        }}
                      />
                    </div>
                    <div className="preview-email-body">
                      <div className="preview-label">Treść:</div>
                      <div
                        className="preview-body-text"
                        dangerouslySetInnerHTML={{
                          __html: processTemplatePreview(
                            sequenceForm.steps[previewStepIndex].body || '(Brak treści)',
                            getSampleContact()
                          ).replace(/\n/g, '<br/>')
                        }}
                      />
                    </div>
                  </div>

                  <div className="preview-tips">
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', marginBottom: '8px' }}>
                      💡 Wskazówka:
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>
                      Zmienne w kolorze żółtym nie zostaną podstawione, bo kontakt nie ma tych danych.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: '14px'
                }}>
                  Dodaj krok, aby zobaczyć podgląd
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* Start Modal */}
      {showStartModal && (
        <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Uruchom Sekwencję</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  Wybierz kontakty do uruchomienia sekwencji: <strong>{selectedSequence?.summary.name}</strong>
                </p>
              </div>
              <button onClick={() => setShowStartModal(false)} style={{
                fontSize: '28px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                lineHeight: 1
              }}>×</button>
            </header>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(90vh - 200px)' }}>
              {/* Filtry */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="🔍 Szukaj po imieniu lub emailu..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                  <input
                    type="email"
                    placeholder="Filtruj po emailu (np. z szansy)"
                    value={contactEmailFilter}
                    onChange={e => setContactEmailFilter(e.target.value)}
                    style={{ flex: 1, minWidth: '220px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                  <select
                    value={companyFilter}
                    onChange={e => setCompanyFilter(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '200px' }}
                  >
                    <option value="">Wszystkie firmy</option>
                    {[...new Set(contacts.map(c => c.company).filter(Boolean))].map(company => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                  <select
                    value={tagFilter}
                    onChange={e => setTagFilter(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '180px' }}
                  >
                    <option value="">Wszystkie tagi</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={excludeInSequence}
                      onChange={e => setExcludeInSequence(e.target.checked)}
                    />
                    Wykluczaj kontakty już w aktywnych sekwencjach
                  </label>
                </div>
              </div>

              {/* Quick Selection */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '0 4px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Szybki wybór:</span>
                <button
                  onClick={() => {
                    const filtered = contacts.filter(c => {
                      const matchesSearch = !contactSearch ||
                        c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                        c.email.toLowerCase().includes(contactSearch.toLowerCase());
                      const matchesEmail = !contactEmailFilter ||
                        (c.email && c.email.toLowerCase().includes(contactEmailFilter.toLowerCase()));
                      const matchesCompany = !companyFilter || c.company === companyFilter;
                      const matchesTag = !tagFilter || (c.tags && c.tags.some(t => t.id === parseInt(tagFilter)));
                      const notInSequence = !excludeInSequence || !c.inActiveSequence;
                      return matchesSearch && matchesEmail && matchesCompany && matchesTag && notInSequence;
                    });
                    setSelectedContactIds(filtered.map(c => c.id));
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Zaznacz wszystkie
                </button>
                <button
                  onClick={() => setSelectedContactIds([])}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Odznacz wszystkie
                </button>
                <span style={{ fontSize: '13px', color: '#059669', fontWeight: '600', marginLeft: 'auto' }}>
                  Wybrano: {selectedContactIds.length}
                </span>
              </div>

              {/* Contact List */}
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#374151', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedContactIds.length > 0 && contacts.filter(c => {
                            const matchesSearch = !contactSearch ||
                              c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                              c.email.toLowerCase().includes(contactSearch.toLowerCase());
                            const matchesEmail = !contactEmailFilter ||
                              (c.email && c.email.toLowerCase().includes(contactEmailFilter.toLowerCase()));
                            const matchesCompany = !companyFilter || c.company === companyFilter;
                            const matchesTag = !tagFilter || (c.tags && c.tags.some(t => t.id === parseInt(tagFilter)));
                            const notInSequence = !excludeInSequence || !c.inActiveSequence;
                            return matchesSearch && matchesEmail && matchesCompany && matchesTag && notInSequence;
                          }).every(c => selectedContactIds.includes(c.id))}
                          onChange={(e) => {
                            const filtered = contacts.filter(c => {
                              const matchesSearch = !contactSearch ||
                                c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                c.email.toLowerCase().includes(contactSearch.toLowerCase());
                              const matchesEmail = !contactEmailFilter ||
                                (c.email && c.email.toLowerCase().includes(contactEmailFilter.toLowerCase()));
                              const matchesCompany = !companyFilter || c.company === companyFilter;
                              const matchesTag = !tagFilter || (c.tags && c.tags.some(t => t.id === parseInt(tagFilter)));
                              const notInSequence = !excludeInSequence || !c.inActiveSequence;
                              return matchesSearch && matchesEmail && matchesCompany && matchesTag && notInSequence;
                            });
                            if (e.target.checked) {
                              setSelectedContactIds(filtered.map(c => c.id));
                            } else {
                              setSelectedContactIds([]);
                            }
                          }}
                        />
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#374151' }}>Imię i nazwisko</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#374151' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#374151' }}>Firma</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#374151' }}>Stanowisko</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#374151' }}>Telefon</th>
                    </tr>
                  </thead>
                  <tbody>
                {contacts
                  .filter(c => {
                    const matchesSearch = !contactSearch ||
                      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                      c.email.toLowerCase().includes(contactSearch.toLowerCase());
                    const matchesEmail = !contactEmailFilter ||
                      (c.email && c.email.toLowerCase().includes(contactEmailFilter.toLowerCase()));
                    const matchesCompany = !companyFilter || c.company === companyFilter;
                    const matchesTag = !tagFilter || (c.tags && c.tags.some(t => t.id === parseInt(tagFilter)));
                    const notInSequence = !excludeInSequence || !c.inActiveSequence;
                    return matchesSearch && matchesEmail && matchesCompany && matchesTag && notInSequence;
                  })
                  .map(contact => {
                        const isSelected = selectedContactIds.includes(contact.id);
                        return (
                          <tr
                            key={contact.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedContactIds(selectedContactIds.filter(id => id !== contact.id));
                              } else {
                                setSelectedContactIds([...selectedContactIds, contact.id]);
                              }
                            }}
                            style={{
                              backgroundColor: isSelected ? '#f0fdf4' : '#fff',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#fff';
                            }}
                          >
                            <td style={{ padding: '12px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td style={{ padding: '12px', fontWeight: '500', fontSize: '14px', color: '#111827' }}>
                              {contact.name || '-'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>
                              {contact.email || '-'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                              {contact.company || '-'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                              {contact.position || '-'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                              {contact.phone || '-'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {contacts.filter(c => {
                const matchesSearch = !contactSearch ||
                  c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                  c.email.toLowerCase().includes(contactSearch.toLowerCase());
                const matchesEmail = !contactEmailFilter ||
                  (c.email && c.email.toLowerCase().includes(contactEmailFilter.toLowerCase()));
                const matchesCompany = !companyFilter || c.company === companyFilter;
                return matchesSearch && matchesCompany;
              }).length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  Brak kontaktów spełniających kryteria
                </div>
              )}
            </div>

            <footer style={{
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {selectedContactIds.length > 0 && (
                  <span>Sekwencja zostanie uruchomiona dla <strong>{selectedContactIds.length}</strong> kontakt{selectedContactIds.length === 1 ? 'u' : 'ów'}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowStartModal(false)}
                  disabled={actionLoading}
                >
                  Anuluj
                </button>
                <button
                  className="btn-primary"
                  onClick={async () => {
                    if (selectedContactIds.length === 0) return alert('Wybierz przynajmniej jeden kontakt');
                    setActionLoading(true);
                    try {
                      let successCount = 0;
                      let errorCount = 0;

                      for (const contactId of selectedContactIds) {
                        try {
                          await sequencesApi.startSequence(selectedSequenceId, contactId);
                          successCount++;
                        } catch (err) {
                          console.error(`Failed to start sequence for contact ${contactId}:`, err);
                          errorCount++;
                        }
                      }

                      alert(`Uruchomiono sekwencję dla ${successCount} kontakt${successCount === 1 ? 'u' : 'ów'}${errorCount > 0 ? `. Błędów: ${errorCount}` : ''}`);
                      setShowStartModal(false);
                      setSelectedContactIds([]);
                      setContactSearch('');
                      setCompanyFilter('');
                      refreshSequences();
                    } catch (err) {
                      alert('Błąd: ' + err.message);
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  disabled={actionLoading || selectedContactIds.length === 0}
                >
                  {actionLoading ? 'Uruchamianie...' : `Uruchom dla ${selectedContactIds.length || 0}`}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Create Sequence Modal */}
      {showCreateSequenceModal && (
        <div className="modal-overlay" onClick={closeCreateSequenceModal}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Nowa Sekwencja</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  Wybierz sposób tworzenia nowej sekwencji
                </p>
              </div>
              <button onClick={closeCreateSequenceModal} style={{
                fontSize: '28px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                lineHeight: 1
              }}>×</button>
            </header>

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div
                  onClick={createEmptySequence}
                  style={{
                    padding: '24px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    backgroundColor: '#fff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📝</div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    Pusta sekwencja
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
                    Rozpocznij od zera i stwórz własną sekwencję krok po kroku
                  </p>
                </div>

                <div
                  onClick={() => {
                    // Wyświetl formularz AI
                    const formContainer = document.getElementById('ai-form-container');
                    if (formContainer) {
                      formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
                    }
                  }}
                  style={{
                    padding: '24px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    backgroundColor: '#fff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#8b5cf6';
                    e.currentTarget.style.backgroundColor = '#faf5ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    Generuj z AI
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
                    Wygeneruj automatycznie sekwencję na podstawie danych klienta
                  </p>
                </div>
              </div>

              {/* AI Configuration Form */}
              <div id="ai-form-container" style={{ display: 'none' }}>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                    Konfiguracja generatora AI
                  </h4>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Link do strony klienta*
                    </label>
                    <input
                      type="url"
                      placeholder="https://klient.pl"
                      value={aiModalData.websiteUrl}
                      onChange={e => setAiModalData({ ...aiModalData, websiteUrl: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                    <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      AI przeanalizuje zawartość strony i dopasuje treść wiadomości
                    </small>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Cel sekwencji
                    </label>
                    <select
                      value={aiModalData.goal}
                      onChange={e => setAiModalData({ ...aiModalData, goal: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        backgroundColor: '#fff'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    >
                      <option value="meeting">Doprowadź do spotkania</option>
                      <option value="discovery">Zbadaj potrzebę (Discovery)</option>
                      <option value="sale">Złóż ofertę</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Dodatkowy kontekst (opcjonalny)
                    </label>
                    <textarea
                      placeholder="np. Spotkaliśmy się na targach, byli zainteresowani, ale milczą"
                      value={aiModalData.additionalContext}
                      onChange={e => setAiModalData({ ...aiModalData, additionalContext: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                    <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Dodatkowe informacje które pomogą AI lepiej dopasować treść
                    </small>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        const formContainer = document.getElementById('ai-form-container');
                        if (formContainer) {
                          formContainer.style.display = 'none';
                        }
                      }}
                      className="btn-secondary"
                      disabled={aiGenerating}
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={generateAISequence}
                      className="btn-primary"
                      disabled={aiGenerating || !aiModalData.websiteUrl}
                      style={{
                        backgroundColor: '#8b5cf6',
                        borderColor: '#8b5cf6',
                        minWidth: '140px'
                      }}
                    >
                      {aiGenerating ? (
                        <>
                          <span>⚡</span> Generuję...
                        </>
                      ) : (
                        <>
                          <span>🤖</span> Generuj sekwencję
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sequences;
