import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext } from 'react-beautiful-dnd';
import toast, { Toaster } from 'react-hot-toast';
import {
  Settings,
  Plus,
  Filter,
  Search,
  Bot,
  Zap
} from 'lucide-react';
import api, { contactsApi, emailAccountsApi, tasksApi, sequencesApi, tagsApi } from '../services/api';
import PipelineColumn from '../components/deals/PipelineColumn';
import '../styles/Deals.css';
import '../styles/Tasks.css';

const Deals = () => {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [activePipeline, setActivePipeline] = useState(null);
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAISequenceModal, setShowAISequenceModal] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [managingStages, setManagingStages] = useState(null);
  const [sharingPipeline, setSharingPipeline] = useState(null);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [tags, setTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [sharedWithAll, setSharedWithAll] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // AI Sequence States
  const [currentDeal, setCurrentDeal] = useState(null);
  const [aiSequenceForm, setAiSequenceForm] = useState({
    websiteUrl: '',
    additionalContext: '',
    goal: 'meeting'
  });
  const [generatedSequence, setGeneratedSequence] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSequences, setActiveSequences] = useState([]);
  const [showSequenceStartModal, setShowSequenceStartModal] = useState(false);
  const [sequenceToStart, setSequenceToStart] = useState(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState('');
  const [isStartingSequence, setIsStartingSequence] = useState(false);

  // Form States
  const [dealForm, setDealForm] = useState({
    title: '',
    value: '',
    currency: 'PLN',
    contactId: '',
    priority: '3'
  });
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactNameFilter, setContactNameFilter] = useState('');
  const [contactEmailFilterDeal, setContactEmailFilterDeal] = useState('');
  const [contactCompanyFilterDeal, setContactCompanyFilterDeal] = useState('');
  const [contactTagFilterDeal, setContactTagFilterDeal] = useState('');
  
  const [editDealForm, setEditDealForm] = useState({
    id: null,
    title: '',
    value: '',
    currency: 'PLN',
    stageId: null,
    priority: '3'
  });

  const [emailFormData, setEmailFormData] = useState({
    to: '',
    subject: '',
    body: '',
    accountId: '',
  });

  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    type: 'todo',
    contactId: '',
    dueDate: '',
    priority: '3',
  });

  const [pipelineForm, setPipelineForm] = useState({
    name: '',
    description: '',
    isDefault: false,
    active: true
  });

  const [stageForm, setStageForm] = useState({
    name: '',
    color: '#60A5FA',
    position: 0,
    probability: 50
  });
  const [stages, setStages] = useState([]);

  useEffect(() => {
    fetchPipelines();
    fetchContacts();
    fetchEmailAccounts();
    fetchAllUsers();
    fetchCurrentUser();
    fetchActiveSequences();
    fetchTags();
  }, []);

  useEffect(() => {
    // Ensure deals is an array before filtering
    const dealsArray = Array.isArray(deals) ? deals : [];

    if (!searchQuery) {
      setFilteredDeals(dealsArray);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredDeals(dealsArray.filter(deal =>
        deal.title.toLowerCase().includes(query) ||
        deal.contact?.name?.toLowerCase().includes(query) ||
        deal.contact?.company?.toLowerCase().includes(query)
      ));
    }
  }, [searchQuery, deals]);

  const fetchEmailAccounts = async () => {
    try {
      const res = await emailAccountsApi.getAll();
      setEmailAccounts(res.data || []);
    } catch (err) {
      console.error('Error fetching email accounts', err);
    }
  };

  const fetchActiveSequences = async () => {
    try {
      const res = await sequencesApi.getActive();
      setActiveSequences(res.data || []);
      if ((res.data || []).length > 0 && !selectedSequenceId) {
        setSelectedSequenceId(res.data[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching active sequences', err);
    }
  };

  const fetchPipelines = async () => {
    try {
      const res = await api.get('/deals/pipelines');
      setPipelines(res.data);
      if (res.data.length > 0) {
        const toActivate = activePipeline ? res.data.find(p => p.id === activePipeline.id) || res.data[0] : res.data[0];
        setActivePipeline(toActivate);
        fetchDeals(toActivate.id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Błąd ładowania lejków');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeals = async (pipelineId) => {
    try {
      const res = await api.get(`/deals/pipeline/${pipelineId}`);
      setDeals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error('Błąd ładowania szans');
      setDeals([]);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await contactsApi.getAll();
      setContacts(res.data);
    } catch (err) {
      console.error('Error fetching contacts', err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await tagsApi.getAll();
      setTags(res.data || []);
    } catch (err) {
      console.error('Error fetching tags', err);
    }
  };

  const handleCloseCreateDealModal = () => {
    setShowModal(false);
    setContactNameFilter('');
    setContactEmailFilterDeal('');
    setContactCompanyFilterDeal('');
    setContactTagFilterDeal('');
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!dealForm.title || !dealForm.contactId) {
      toast.error('Tytuł i Kontakt są wymagane');
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading('Tworzenie szansy...');
    try {
      const payload = {
        title: dealForm.title,
        value: parseFloat(dealForm.value) || 0,
        currency: dealForm.currency,
        contact: { id: parseInt(dealForm.contactId) },
        pipeline: { id: activePipeline.id },
        priority: parseInt(dealForm.priority)
      };

      await api.post('/deals', payload);
      toast.success('Szansa dodana pomyślnie!', { id: loadingToast });
      setShowModal(false);
      setDealForm({ title: '', value: '', currency: 'PLN', contactId: '', priority: '3' });
      setContactSearchQuery('');
      setContactNameFilter('');
      setContactEmailFilterDeal('');
      setContactCompanyFilterDeal('');
      setContactTagFilterDeal('');
      fetchDeals(activePipeline.id);
    } catch (err) {
      console.error(err);
      toast.error('Błąd tworzenia szansy', { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const movedDeal = deals.find(d => d.id.toString() === draggableId);
    const newStageId = parseInt(destination.droppableId);
    const newStage = (activePipeline?.stages || []).find(s => s.id === newStageId);
    
    if (!movedDeal || !newStage) {
      toast.error('Błąd przy przenoszeniu szansy');
      return;
    }

    const updatedDeals = deals.map(d => 
      d.id.toString() === draggableId ? { ...d, stage: newStage } : d
    );
    setDeals(updatedDeals);
    setFilteredDeals(prev => prev.map(d => 
      d.id.toString() === draggableId ? { ...d, stage: newStage } : d
    ));

    try {
      await api.put(`/deals/${draggableId}/stage`, { stageId: newStageId });
      toast.success(`Zmieniono etap: ${movedDeal.title}`, { position: 'bottom-right' });
    } catch (err) {
      console.error('Failed to move deal', err);
      toast.error('Błąd zmiany etapu');
      fetchDeals(activePipeline.id);
    }
  };

  const handleAddTask = (deal) => {
    if (deal.contact) {
      setTaskFormData({
        title: `Zadanie dla: ${deal.contact.name}`,
        description: `Dotyczy szansy: ${deal.title}`,
        type: 'todo',
        contactId: deal.contact.id.toString(),
        dueDate: '',
        priority: '3',
      });
      setShowTaskModal(true);
    } else {
      toast.error('Brak kontaktu dla tej szansy');
    }
  };

  const handleSequence = async (deal) => {
    if (!deal.contact) {
      toast.error('Brak kontaktu dla tej szansy');
      return;
    }
    if (!deal.contact.email) {
      toast.error('Kontakt nie ma przypisanego adresu email');
      return;
    }

    if (!activeSequences.length) {
      await fetchActiveSequences();
    }

    if (!activeSequences.length) {
      // Brak aktywnych sekwencji – od razu do kreatora z danymi szansy
      navigate('/sequences', {
        state: {
          fromDeal: true,
          dealId: deal.id,
          dealTitle: deal.title,
          contactId: deal.contact.id,
          contactName: deal.contact.name,
          contactEmail: deal.contact.email,
          autoOpenCreate: true
        }
      });
      return;
    }

    setSequenceToStart(deal);
    setSelectedSequenceId(activeSequences[0]?.id?.toString() || '');
    setShowSequenceStartModal(true);
  };

  const getNextStageForDeal = (deal) => {
    if (!deal?.stage || !activePipeline?.stages?.length) return null;
    const stagesSorted = [...activePipeline.stages].sort((a, b) => {
      const posA = typeof a.position === 'number' ? a.position : 0;
      const posB = typeof b.position === 'number' ? b.position : 0;
      return posA - posB;
    });
    const currentIndex = stagesSorted.findIndex(s => s.id === deal.stage.id);
    if (currentIndex === -1 || currentIndex >= stagesSorted.length - 1) {
      return null;
    }
    return stagesSorted[currentIndex + 1];
  };

  const startSequenceForDeal = async () => {
    if (!sequenceToStart || !selectedSequenceId) return;

    setIsStartingSequence(true);
    try {
      await sequencesApi.startSequence(
        Number(selectedSequenceId),
        sequenceToStart.contact.id,
        sequenceToStart.id
      );

      const nextStage = getNextStageForDeal(sequenceToStart);
      if (nextStage) {
        const updateDealStage = (deal) =>
          deal.id === sequenceToStart.id ? { ...deal, stage: nextStage } : deal;
        setDeals(prev => prev.map(updateDealStage));
        setFilteredDeals(prev => prev.map(updateDealStage));
        toast.success(`Sekwencja uruchomiona. Szansa przesunięta do etapu ${nextStage.name}`);
      } else {
        toast.success('Sekwencja uruchomiona. Etap pozostaje bez zmian.');
      }

      setShowSequenceStartModal(false);
      setSequenceToStart(null);
    } catch (err) {
      console.error('Error starting sequence from deal', err);
      const message = err.response?.data?.error || 'Nie udało się uruchomić sekwencji';
      toast.error(message);
    } finally {
      setIsStartingSequence(false);
    }
  };

  const handleEmail = async (deal) => {
    if (deal.contact?.email) {
        let defaultAccount = '';
        if (emailAccounts.length > 0) {
           defaultAccount = emailAccounts[0].id;
           try {
             const response = await contactsApi.getContactEmails(deal.contact.id);
             const emails = response.data?.emails || [];
             const lastReceived = emails.find(email => email.status !== 'sent' && email.account);
             if (lastReceived && lastReceived.account) {
               defaultAccount = lastReceived.account.id;
             } else {
                const lastSent = emails.find(email => email.account);
                if (lastSent && lastSent.account) {
                  defaultAccount = lastSent.account.id;
                }
             }
           } catch (err) {
             // Ignore error
           }
        }

        setEmailFormData({
            to: deal.contact.email,
            subject: deal.title ? `Dotyczy: ${deal.title}` : '',
            body: '',
            accountId: defaultAccount
        });
        setShowEmailModal(true);
    } else {
        toast.error('Brak adresu email dla tego kontaktu');
    }
  };

  const handleEditDeal = (deal) => {
      setEditDealForm({
          id: deal.id,
          title: deal.title,
          value: deal.value,
          currency: deal.currency,
          stageId: deal.stage.id,
          priority: deal.priority?.toString() || '3'
      });
      setShowEditModal(true);
  };

  const handleDeleteDeal = async (deal) => {
    if (!confirm(`Czy na pewno chcesz usunąć szansę "${deal.title}"?`)) {
      return;
    }

    try {
      await api.delete(`/deals/${deal.id}`);
      toast.success('Szansa usunięta');
      fetchDeals();
    } catch (err) {
      console.error('Error deleting deal:', err);
      toast.error('Błąd usuwania szansy');
    }
  };

  const handleEditDealSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put(`/deals/${editDealForm.id}`, {
        title: editDealForm.title,
        value: parseFloat(editDealForm.value) || 0,
        currency: editDealForm.currency,
        priority: parseInt(editDealForm.priority)
      });

      const currentDeal = deals.find(d => d.id === editDealForm.id);
      if (currentDeal && currentDeal.stage.id !== editDealForm.stageId) {
        await api.put(`/deals/${editDealForm.id}/stage`, { stageId: editDealForm.stageId });
      }

      toast.success('Szansa zaktualizowana');
      setShowEditModal(false);
      fetchDeals(activePipeline.id);
    } catch (err) {
      console.error(err);
      toast.error('Błąd aktualizacji szansy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!emailFormData.accountId || !emailFormData.subject || !emailFormData.body) {
        toast.error('Wypełnij wszystkie wymagane pola');
        return;
    }
    setIsSaving(true);
    try {
        await api.post('/emails/send', {
            to: emailFormData.to,
            subject: emailFormData.subject,
            body: emailFormData.body,
            accountId: Number(emailFormData.accountId)
        });
        toast.success('Email wysłany!');
        setShowEmailModal(false);
    } catch (err) {
        toast.error('Błąd wysyłki emaila');
    } finally {
        setIsSaving(false);
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await tasksApi.create(taskFormData);
      toast.success('Zadanie utworzone');
      setShowTaskModal(false);
    } catch (error) {
      toast.error('Błąd tworzenia zadania');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePipeline = () => {
    setEditingPipeline(null);
    setPipelineForm({ name: '', description: '', isDefault: false, active: true });
    setShowPipelineModal(true);
  };

  const handleEditPipeline = (pipeline) => {
      setEditingPipeline(pipeline);
      setPipelineForm({
          name: pipeline.name,
          description: pipeline.description || '',
          isDefault: pipeline.isDefault,
          active: pipeline.active
      });
      setShowPipelineModal(true);
  };
  
  const handleSavePipeline = async (e) => {
    e.preventDefault();
    if (!pipelineForm.name.trim()) {
      toast.error('Nazwa lejka jest wymagana');
      return;
    }
    setIsSaving(true);
    try {
        let savedPipeline;
        if (editingPipeline) {
            const res = await api.put(`/deals/pipelines/${editingPipeline.id}`, pipelineForm);
            savedPipeline = res.data;
        } else {
            const res = await api.post('/deals/pipelines', pipelineForm);
            savedPipeline = res.data;
        }
        toast.success('Lejek zapisany');
        setShowPipelineModal(false);
        
        // Pobierz zaktualizowaną listę i ustaw nowy/edytowany lejek jako aktywny
        const pipelinesRes = await api.get('/deals/pipelines');
        setPipelines(pipelinesRes.data);
        
        // Znajdź zaktualizowany pipeline ze stages
        const updatedPipeline = pipelinesRes.data.find(p => p.id === savedPipeline.id);
        if (updatedPipeline) {
          setActivePipeline(updatedPipeline);
          fetchDeals(updatedPipeline.id);
        }
    } catch(err) {
        console.error('Error saving pipeline:', err);
        toast.error('Błąd zapisu lejka');
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeletePipeline = async (pipelineId) => {
    // Znajdź pipeline i policz szanse
    const pipeline = pipelines.find(p => p.id === pipelineId);
    const pipelineDeals = deals.filter(d =>
      pipeline && pipeline.stages && pipeline.stages.some(s => d.stage && d.stage.id === s.id)
    );
    const dealCount = pipelineDeals.length;

    const message = dealCount > 0
      ? `Czy na pewno chcesz usunąć ten lejek?\n\nZOSTANIE USUNIĘTYCH ${dealCount} ${dealCount === 1 ? 'SZANSA' : dealCount < 5 ? 'SZANSE' : 'SZANS'}!\n\nTej operacji nie można cofnąć.`
      : 'Czy na pewno chcesz usunąć ten lejek?';

    if (!confirm(message)) {
      return;
    }

    try {
      await api.delete(`/deals/pipelines/${pipelineId}`);
      toast.success('Lejek usunięty');
      fetchPipelines();
    } catch (err) {
      console.error('Error deleting pipeline:', err);
      toast.error('Błąd usuwania lejka');
    }
  };

  const handleManageStages = async (pipeline) => {
    setManagingStages(pipeline);
    try {
      const res = await api.get(`/deals/pipelines/${pipeline.id}/stages`);
      setStages(res.data);
      setShowStageModal(true);
    } catch (err) {
      toast.error('Błąd pobierania etapów');
    }
  };

  const handleAddStage = async () => {
      if(!stageForm.name.trim()) {
        toast.error('Nazwa etapu jest wymagana');
        return;
      }
      try {
          await api.post(`/deals/pipelines/${managingStages.id}/stages`, { ...stageForm, position: stages.length });
          const res = await api.get(`/deals/pipelines/${managingStages.id}/stages`);
          setStages(res.data);
          setStageForm({ name: '', color: '#60A5FA', position: 0, probability: 50 });
          toast.success('Etap dodany');
          
          // Odśwież activePipeline jeśli edytujemy aktualny lejek
          if (activePipeline && activePipeline.id === managingStages.id) {
            const pipelinesRes = await api.get('/deals/pipelines');
            const updatedPipeline = pipelinesRes.data.find(p => p.id === managingStages.id);
            if (updatedPipeline) {
              setActivePipeline(updatedPipeline);
              setPipelines(pipelinesRes.data);
            }
          }
      } catch(err) {
          console.error('Error adding stage:', err);
          toast.error('Błąd dodawania etapu');
      }
  };

  const handleDeleteStage = async (stageId) => {
    if (!confirm('Czy na pewno chcesz usunąć ten etap? Szanse przypisane do tego etapu zostaną usunięte!')) {
      return;
    }

    try {
      await api.delete(`/deals/stages/${stageId}`);
      const res = await api.get(`/deals/pipelines/${managingStages.id}/stages`);
      setStages(res.data);
      toast.success('Etap usunięty');
      
      // Odśwież activePipeline jeśli usuwamy etap z aktualnego lejka
      if (activePipeline && activePipeline.id === managingStages.id) {
        const pipelinesRes = await api.get('/deals/pipelines');
        const updatedPipeline = pipelinesRes.data.find(p => p.id === managingStages.id);
        if (updatedPipeline) {
          setActivePipeline(updatedPipeline);
          setPipelines(pipelinesRes.data);
          fetchDeals(managingStages.id);
        }
      }
    } catch (err) {
      console.error('Error deleting stage:', err);
      toast.error('Błąd usuwania etapu');
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await api.get('/users');
      setAllUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/users/me');
      setCurrentUser(res.data);
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const handleSharePipeline = async (pipeline) => {
    setSharingPipeline(pipeline);
    try {
      const res = await api.get(`/pipelines/${pipeline.id}/shared-users`);
      setSharedWithAll(res.data.sharedWithAll || false);
      setSharedUsers(res.data.sharedUsers || []);
      setSelectedUsers((res.data.sharedUsers || []).map(u => u.id));
      setShowShareModal(true);
    } catch (err) {
      console.error('Error fetching shared users:', err);
      toast.error('Błąd pobierania danych udostępnienia');
    }
  };

  const handleSaveSharing = async () => {
    if (!sharingPipeline) return;

    setIsSaving(true);
    try {
      await api.post(`/pipelines/${sharingPipeline.id}/share`, {
        sharedWithAll: sharedWithAll,
        userIds: selectedUsers
      });
      toast.success('Ustawienia udostępnienia zapisane');
      setShowShareModal(false);
    } catch (err) {
      console.error('Error saving sharing settings:', err);
      toast.error('Błąd zapisu ustawień udostępnienia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleAISequence = (deal) => {
    setCurrentDeal(deal);
    setAiSequenceForm({
      websiteUrl: '',
      additionalContext: '',
      goal: 'meeting'
    });
    setGeneratedSequence(null);
    setShowAISequenceModal(true);
  };

  const handleGenerateAISequence = async (e) => {
    e.preventDefault();
    if (!currentDeal || !aiSequenceForm.goal) {
      toast.error('Wybierz cel sekwencji');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.post('/ai/generate-sequence', {
        dealId: currentDeal.id,
        websiteUrl: aiSequenceForm.websiteUrl,
        additionalContext: aiSequenceForm.additionalContext,
        goal: aiSequenceForm.goal
      });

      setGeneratedSequence(response.data);
      toast.success('Sekwencja wygenerowana pomyślnie');
    } catch (err) {
      console.error('Error generating AI sequence:', err);
      toast.error('Błąd generowania sekwencji');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptAISequence = async () => {
    if (!generatedSequence || !currentDeal) return;

    setIsSaving(true);
    try {
      // TODO: Implementacja tworzenia sekwencji w systemie
      // 1. Utworzenie nowej sekwencji
      // 2. Dodanie kroków sekwencji
      // 3. Przypisanie do kontaktu
      // 4. Przesunięcie deala do etapu "W sekwencji"

      toast.success('Sekwencja uruchomiona pomyślnie');
      setShowAISequenceModal(false);
      fetchDeals(activePipeline.id);
    } catch (err) {
      console.error('Error accepting AI sequence:', err);
      toast.error('Błąd uruchamiania sekwencji');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="container loading-screen">Ładowanie systemu CRM...</div>;

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <div className="deals-board-wrapper">
        <Toaster position="top-right" />
      
      <div className="deals-header">
        <div>
          <h1>Sales Pipeline</h1>
          <div className="pipeline-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
             {pipelines.length > 1 && pipelines.map(p => (
                <button
                  key={p.id}
                  className={`btn ${activePipeline?.id === p.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setActivePipeline(p); fetchDeals(p.id); }}
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  {p.name}
                </button>
              ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="search-box" style={{ position: 'relative' }}>
             <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
             <input 
               type="text" 
               placeholder="Szukaj szansy..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               style={{ paddingLeft: '34px', height: '38px', borderRadius: '6px', border: '1px solid #d1d5db' }}
             />
          </div>
          <button className="btn btn-secondary" onClick={handleCreatePipeline}>
            <Settings size={16} /> Zarządzaj lejkami
          </button>
          {activePipeline && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Nowa Szansa
            </button>
          )}
        </div>
      </div>

      {!activePipeline ? (
        <div className="empty-state-container" style={{ textAlign: 'center', marginTop: '60px' }}>
           <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
           <h3>Witaj w module Sprzedaży</h3>
           <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto 24px auto' }}>
             Nie masz jeszcze żadnego aktywnego lejka sprzedażowego. Utwórz pierwszy lejek, aby zacząć zarządzać procesem.
           </p>
           <button className="btn btn-primary" onClick={handleCreatePipeline}>
             Rozpocznij konfigurację
           </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board">
            {(activePipeline.stages && activePipeline.stages.length > 0) ? (
              activePipeline.stages.map(stage => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  deals={filteredDeals}
                  onEditDeal={handleEditDeal}
                  onEmailDeal={handleEmail}
                  onTaskDeal={handleAddTask}
                  onSequenceDeal={handleSequence}
                  onDeleteDeal={handleDeleteDeal}
                />
              ))
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px', 
                color: '#6b7280',
                gridColumn: '1 / -1'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <h3 style={{ marginBottom: '12px' }}>Brak etapów w tym lejku</h3>
                <p style={{ marginBottom: '24px', maxWidth: '400px', margin: '0 auto' }}>
                  Dodaj etapy do lejka, aby móc zarządzać szansami sprzedażowymi.
                </p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleManageStages(activePipeline)}
                >
                  Dodaj etapy
                </button>
              </div>
            )}
          </div>
        </DragDropContext>
      )}

      {/* --- MODALS --- */}
      {/* Start Sequence Modal */}
      {showSequenceStartModal && sequenceToStart && (
        <div className="modal-overlay" onClick={() => !isStartingSequence && setShowSequenceStartModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Uruchom sekwencję</h2>
              <button className="modal-close" onClick={() => setShowSequenceStartModal(false)} disabled={isStartingSequence}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '12px', color: '#4b5563', lineHeight: 1.4 }}>
                <div><strong>Szansa:</strong> {sequenceToStart.title}</div>
                <div><strong>Kontakt:</strong> {sequenceToStart.contact?.name} ({sequenceToStart.contact?.email})</div>
              </div>
              <div className="form-group">
                <label>Wybierz sekwencję</label>
                <select
                  value={selectedSequenceId}
                  onChange={e => setSelectedSequenceId(e.target.value)}
                  disabled={isStartingSequence}
                >
                  {activeSequences.map(seq => (
                    <option key={seq.id} value={seq.id}>{seq.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#374151' }}>
                <div><strong>Aktualny etap:</strong> {sequenceToStart.stage?.name}</div>
                <div>
                  <strong>Po uruchomieniu:</strong>{' '}
                  {getNextStageForDeal(sequenceToStart)?.name || 'Brak kolejnego etapu — etap pozostanie bez zmian.'}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowSequenceStartModal(false)} disabled={isStartingSequence}>
                Anuluj
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={startSequenceForDeal}
                disabled={!selectedSequenceId || isStartingSequence}
              >
                {isStartingSequence ? 'Uruchamianie...' : 'Uruchom sekwencję'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Deal Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !isSaving && handleCloseCreateDealModal()}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nowa szansa</h2>
              <button className="modal-close" onClick={handleCloseCreateDealModal}>×</button>
            </div>
            <form className="modal-body" onSubmit={handleCreateDeal}>
              <div className="form-group">
                <label>Tytuł szansy *</label>
                <input
                  type="text"
                  value={dealForm.title}
                  onChange={e => setDealForm({...dealForm, title: e.target.value})}
                  placeholder="np. Wdrożenie systemu"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Wartość</label>
                  <input
                    type="number"
                    value={dealForm.value}
                    onChange={e => setDealForm({...dealForm, value: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Waluta</label>
                  <select
                    value={dealForm.currency}
                    onChange={e => setDealForm({...dealForm, currency: e.target.value})}
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Priorytet</label>
                <select value={dealForm.priority} onChange={e => setDealForm({...dealForm, priority: e.target.value})}>
                   <option value="1">Wysoki 🔥</option>
                   <option value="2">Średni ⚡</option>
                   <option value="3">Niski ☕</option>
                </select>
              </div>
              <div className="form-group">
                <label>Klient *</label>

                {/* Filtry */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Imię / Nazwisko
                    </label>
                    <input
                      type="text"
                      placeholder="Jan Kowalski"
                      value={contactNameFilter}
                      onChange={e => setContactNameFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '13px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Email
                    </label>
                    <input
                      type="text"
                      placeholder="jan@example.com"
                      value={contactEmailFilterDeal}
                      onChange={e => setContactEmailFilterDeal(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '13px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Firma
                    </label>
                    <input
                      type="text"
                      placeholder="ACME Corp"
                      value={contactCompanyFilterDeal}
                      onChange={e => setContactCompanyFilterDeal(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '13px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Tag
                    </label>
                    <select
                      value={contactTagFilterDeal}
                      onChange={e => setContactTagFilterDeal(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '13px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="">Wszystkie tagi</option>
                      {tags.map(tag => (
                        <option key={tag.id} value={tag.id}>{tag.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <small style={{ color: '#6b7280', fontSize: '12px' }}>
                      Znaleziono: {contacts.filter(c => {
                        const nameMatch = !contactNameFilter.trim() ||
                          (c.name && c.name.toLowerCase().includes(contactNameFilter.toLowerCase()));
                        const emailMatch = !contactEmailFilterDeal.trim() ||
                          (c.email && c.email.toLowerCase().includes(contactEmailFilterDeal.toLowerCase()));
                        const companyMatch = !contactCompanyFilterDeal.trim() ||
                          (c.company && c.company.toLowerCase().includes(contactCompanyFilterDeal.toLowerCase()));
                        const tagMatch = !contactTagFilterDeal ||
                          (c.tags && c.tags.some(t => t.id.toString() === contactTagFilterDeal));
                        return nameMatch && emailMatch && companyMatch && tagMatch;
                      }).length} kontaktów
                    </small>
                    <button
                      type="button"
                      onClick={() => {
                        setContactNameFilter('');
                        setContactEmailFilterDeal('');
                        setContactCompanyFilterDeal('');
                        setContactTagFilterDeal('');
                      }}
                      style={{
                        fontSize: '12px',
                        color: '#3b82f6',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Wyczyść filtry
                    </button>
                  </div>
                </div>

                {/* Lista kontaktów */}
                <select
                  value={dealForm.contactId}
                  onChange={e => setDealForm({...dealForm, contactId: e.target.value})}
                  required
                  size={8}
                  style={{
                    height: 'auto',
                    minHeight: '180px',
                    width: '100%'
                  }}
                >
                  <option value="">-- Wybierz klienta --</option>
                  {contacts
                    .filter(c => {
                      const nameMatch = !contactNameFilter.trim() ||
                        (c.name && c.name.toLowerCase().includes(contactNameFilter.toLowerCase()));
                      const emailMatch = !contactEmailFilterDeal.trim() ||
                        (c.email && c.email.toLowerCase().includes(contactEmailFilterDeal.toLowerCase()));
                      const companyMatch = !contactCompanyFilterDeal.trim() ||
                        (c.company && c.company.toLowerCase().includes(contactCompanyFilterDeal.toLowerCase()));
                      const tagMatch = !contactTagFilterDeal ||
                        (c.tags && c.tags.some(t => t.id.toString() === contactTagFilterDeal));
                      return nameMatch && emailMatch && companyMatch && tagMatch;
                    })
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} • {c.email} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseCreateDealModal}>Anuluj</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Tworzenie...' : 'Utwórz'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Deal Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => !isSaving && setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
             <div className="modal-header">
              <h2>Edytuj szansę</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form className="modal-body" onSubmit={handleEditDealSubmit}>
               <div className="form-group">
                <label>Tytuł *</label>
                <input
                  type="text"
                  value={editDealForm.title}
                  onChange={e => setEditDealForm({...editDealForm, title: e.target.value})}
                  required
                />
               </div>
               <div className="form-row">
                  <div className="form-group">
                    <label>Wartość</label>
                    <input type="number" value={editDealForm.value} onChange={e => setEditDealForm({...editDealForm, value: e.target.value})} />
                  </div>
                  <div className="form-group">
                     <label>Etap</label>
                     <select value={editDealForm.stageId} onChange={e => setEditDealForm({...editDealForm, stageId: Number(e.target.value)})}>
                        {(activePipeline?.stages || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                  </div>
               </div>
               <div className="form-group">
                  <label>Priorytet</label>
                  <select value={editDealForm.priority} onChange={e => setEditDealForm({...editDealForm, priority: e.target.value})}>
                     <option value="1">Wysoki</option>
                     <option value="2">Średni</option>
                     <option value="3">Niski</option>
                  </select>
               </div>
               <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Anuluj</button>
                  <button type="submit" className="btn btn-primary">Zapisz zmiany</button>
               </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Task Modal */}
      {showTaskModal && (
        <div
          className="task-modal-overlay"
          onClick={() => !isSaving && setShowTaskModal(false)}
          role="presentation"
        >
          <div
            className="task-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header className="task-modal__header">
              <div>
                <h2>Nowe zadanie</h2>
                <p>Dotyczy: {taskFormData.title.split('Dotyczy szansy: ')[1] || 'Szansy'}</p>
              </div>
              <button
                type="button"
                className="task-modal__close"
                onClick={() => setShowTaskModal(false)}
                disabled={isSaving}
                aria-label="Zamknij"
              >
                ×
              </button>
            </header>

            <form className="task-form" onSubmit={handleTaskSubmit}>
              <div className="task-form__section">
                <label className="task-form__label">
                  Tytuł <span>*</span>
                  <input
                    type="text"
                    value={taskFormData.title}
                    onChange={(e) =>
                      setTaskFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="np. Oddzwonić do klienta"
                    required
                    disabled={isSaving}
                  />
                </label>
              </div>

              <div className="task-form__grid">
                <label className="task-form__label">
                  Typ zadania
                  <div className="task-form__chips">
                    {[
                      { value: 'todo', label: 'Do zrobienia', icon: '📝' },
                      { value: 'call', label: 'Telefon', icon: '📞' },
                      { value: 'email', label: 'Email', icon: '📧' },
                      { value: 'meeting', label: 'Spotkanie', icon: '🤝' },
                    ].map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        className={`task-form__chip ${
                          taskFormData.type === option.value ? 'active' : ''
                        }`}
                        onClick={() =>
                          setTaskFormData((prev) => ({ ...prev, type: option.value }))
                        }
                        disabled={isSaving}
                      >
                        <span>{option.icon}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="task-form__label">
                  Priorytet
                  <div className="task-form__chips">
                    {[
                      { value: '1', label: 'Wysoki', tone: 'high' },
                      { value: '2', label: 'Średni', tone: 'medium' },
                      { value: '3', label: 'Niski', tone: 'low' },
                    ].map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        className={`task-form__chip priority-${option.tone} ${
                          taskFormData.priority === option.value ? 'active' : ''
                        }`}
                        onClick={() =>
                          setTaskFormData((prev) => ({ ...prev, priority: option.value }))
                        }
                        disabled={isSaving}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <div className="task-form__grid">
                <label className="task-form__label">
                  Termin realizacji
                  <input
                    type="datetime-local"
                    value={taskFormData.dueDate}
                    onChange={(e) =>
                      setTaskFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                  <div className="task-form__quick">
                    <button
                      type="button"
                      onClick={() =>
                        setTaskFormData((prev) => ({
                          ...prev,
                          dueDate: new Date().toISOString().slice(0, 16),
                        }))
                      }
                      disabled={isSaving}
                    >
                      Dzisiaj
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setTaskFormData((prev) => ({
                          ...prev,
                          dueDate: tomorrow.toISOString().slice(0, 16),
                        }));
                      }}
                      disabled={isSaving}
                    >
                      Jutro
                    </button>
                  </div>
                </label>
              </div>

              <div className="task-form__section">
                <label className="task-form__label">
                  Notatki
                  <textarea
                    value={taskFormData.description}
                    onChange={(e) =>
                      setTaskFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Dodatkowe informacje..."
                    rows={4}
                    disabled={isSaving}
                  />
                </label>
              </div>

              <div className="task-modal__footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTaskModal(false)}
                  disabled={isSaving}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Tworzenie...' : 'Utwórz zadanie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div
          className="task-modal-overlay"
          onClick={() => !isSaving && setShowEmailModal(false)}
          role="presentation"
        >
          <div
            className="task-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header className="task-modal__header">
              <div>
                <h2>Wyślij wiadomość</h2>
                <p>Do: {emailFormData.to}</p>
              </div>
              <button
                type="button"
                className="task-modal__close"
                onClick={() => setShowEmailModal(false)}
                disabled={isSaving}
                aria-label="Zamknij"
              >
                ×
              </button>
            </header>

            <form className="task-form" onSubmit={handleEmailSubmit}>
              <div className="task-form__section">
                <label className="task-form__label">
                  Konto wysyłkowe <span>*</span>
                  <select
                    value={emailFormData.accountId}
                    onChange={(e) => setEmailFormData(prev => ({ ...prev, accountId: e.target.value }))}
                    required
                    disabled={isSaving}
                  >
                    <option value="">-- Wybierz konto --</option>
                    {emailAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.displayName} ({acc.emailAddress})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="task-form__section">
                <label className="task-form__label">
                  Temat <span>*</span>
                  <input
                    type="text"
                    value={emailFormData.subject}
                    onChange={(e) => setEmailFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Temat wiadomości"
                    required
                    disabled={isSaving}
                  />
                </label>
              </div>

              <div className="task-form__section">
                <label className="task-form__label">
                  Treść wiadomości <span>*</span>
                  <textarea
                    value={emailFormData.body}
                    onChange={(e) => setEmailFormData(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="Treść..."
                    rows={8}
                    required
                    disabled={isSaving}
                  />
                </label>
              </div>

              <div className="task-modal__footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEmailModal(false)}
                  disabled={isSaving}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Wysyłanie...' : 'Wyślij email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pipeline Management Modal (Restored Detailed Version) */}
      {showPipelineModal && (
        <div className="modal-overlay" onClick={() => !isSaving && setShowPipelineModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>Zarządzanie lejkami</h2>
              <button className="modal-close" onClick={() => setShowPipelineModal(false)} disabled={isSaving}>×</button>
            </div>
            <div className="modal-body">
              <h3>{editingPipeline ? 'Edytuj lejek' : 'Utwórz nowy lejek'}</h3>
              <form onSubmit={handleSavePipeline} style={{ marginBottom: '30px' }}>
                <div className="form-group">
                  <label>Nazwa lejka *</label>
                  <input
                    type="text"
                    value={pipelineForm.name}
                    onChange={e => setPipelineForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="np. Sprzedaż B2B"
                    required
                    disabled={isSaving}
                  />
                </div>
                <div className="form-group">
                  <label>Opis</label>
                  <textarea
                    value={pipelineForm.description}
                    onChange={e => setPipelineForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Opcjonalny opis lejka"
                    rows={3}
                    disabled={isSaving}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Zapisywanie...' : editingPipeline ? 'Zaktualizuj' : 'Utwórz lejek'}
                  </button>
                  {editingPipeline && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleManageStages(editingPipeline)}
                      disabled={isSaving}
                    >
                      Zarządzaj etapami
                    </button>
                  )}
                </div>
              </form>

              <h3 style={{ marginTop: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                Istniejące lejki
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pipelines.map(pipeline => (
                  <div key={pipeline.id} style={{
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: pipeline.isDefault ? '#eff6ff' : 'white'
                  }}>
                    <div>
                      <strong>{pipeline.name}</strong>
                      {pipeline.isDefault && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3b82f6' }}>⭐ Domyślny</span>}
                      {pipeline.description && (
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          {pipeline.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {currentUser && pipeline.userId === currentUser.id && (
                        <button
                          className="btn-icon"
                          onClick={() => handleSharePipeline(pipeline)}
                          title="Udostępnij użytkownikom"
                        >
                          👥
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        onClick={() => handleManageStages(pipeline)}
                        title="Zarządzaj etapami"
                      >
                        📋
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleEditPipeline(pipeline)}
                        title="Edytuj"
                      >
                        ✏️
                      </button>
                      {!pipeline.isDefault && (
                        <button
                          className="btn-icon"
                          onClick={() => handleDeletePipeline(pipeline.id)}
                          title="Usuń"
                          style={{ color: '#ef4444' }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage Management Modal (Restored Detailed Version) */}
      {showStageModal && managingStages && (
        <div className="modal-overlay" onClick={() => setShowStageModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Zarządzaj etapami: {managingStages.name}</h2>
              <button className="modal-close" onClick={() => setShowStageModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <h3>Dodaj nowy etap</h3>
              <div style={{ marginBottom: '30px' }}>
                <div className="form-group">
                  <label>Nazwa etapu *</label>
                  <input
                    type="text"
                    value={stageForm.name}
                    onChange={e => setStageForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="np. Wstępny kontakt"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label>Kolor</label>
                    <input
                      type="color"
                      value={stageForm.color}
                      onChange={e => setStageForm(prev => ({ ...prev, color: e.target.value }))}
                      style={{ height: '40px', width: '100%' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Prawdopodobieństwo (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={stageForm.probability}
                      onChange={e => setStageForm(prev => ({ ...prev, probability: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <button type="button" className="btn btn-primary" onClick={handleAddStage}>
                  Dodaj etap
                </button>
              </div>

              <h3 style={{ marginTop: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                Istniejące etapy
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stages.map((stage, index) => (
                  <div key={stage.id} style={{
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: `4px solid ${stage.color}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>#{index + 1}</span>
                      <div>
                        <strong>{stage.name}</strong>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Prawdopodobieństwo: {stage.probability}%
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => handleDeleteStage(stage.id)}
                      style={{ color: '#ef4444' }}
                      title="Usuń etap"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Pipeline Modal */}
      {showShareModal && sharingPipeline && (
        <div className="modal-overlay" onClick={() => !isSaving && setShowShareModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Udostępnij lejek: {sharingPipeline.name}</h2>
              <button className="modal-close" onClick={() => setShowShareModal(false)} disabled={isSaving}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid #e5e7eb'
                }}>
                  <input
                    type="checkbox"
                    checked={sharedWithAll}
                    onChange={(e) => setSharedWithAll(e.target.checked)}
                    disabled={isSaving}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>Udostępnij wszystkim użytkownikom</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      Wszyscy użytkownicy w systemie będą mogli przeglądać ten lejek
                    </div>
                  </div>
                </label>
              </div>

              {!sharedWithAll && (
                <div>
                  <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                    Wybierz użytkowników do udostępnienia
                  </h3>
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    backgroundColor: 'white'
                  }}>
                    {allUsers.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        Brak innych użytkowników w systemie
                      </div>
                    ) : (
                      allUsers.map(user => (
                        <label
                          key={user.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 16px',
                            borderBottom: '1px solid #f3f4f6',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s',
                            backgroundColor: selectedUsers.includes(user.id) ? '#eff6ff' : 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedUsers.includes(user.id)) {
                              e.currentTarget.style.backgroundColor = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedUsers.includes(user.id)) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleToggleUserSelection(user.id)}
                            disabled={isSaving}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', fontSize: '14px' }}>
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.username}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {user.email}
                            </div>
                          </div>
                          {user.role === 'ADMIN' && (
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '12px',
                              fontWeight: '500'
                            }}>
                              ADMIN
                            </span>
                          )}
                        </label>
                      ))
                    )}
                  </div>

                  {selectedUsers.length > 0 && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#0369a1'
                    }}>
                      Wybrano użytkowników: {selectedUsers.length}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowShareModal(false)}
                  disabled={isSaving}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveSharing}
                  disabled={isSaving}
                >
                  {isSaving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Sequence Modal */}
      {showAISequenceModal && currentDeal && (
        <div className="modal-overlay" onClick={() => !isSaving && !isGenerating && setShowAISequenceModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>🤖 Utwórz sekwencję AI</h2>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                Klient: <strong>{currentDeal.contact?.name}</strong>
                {currentDeal.contact?.company && ` (${currentDeal.contact.company})`}
              </div>
              <button className="modal-close" onClick={() => setShowAISequenceModal(false)} disabled={isSaving || isGenerating}>×</button>
            </div>

            {!generatedSequence ? (
              // Formularz konfiguracji
              <form className="modal-body" onSubmit={handleGenerateAISequence}>
                <div className="form-group">
                  <label>Strona WWW klienta</label>
                  <input
                    type="url"
                    value={aiSequenceForm.websiteUrl}
                    onChange={e => setAiSequenceForm({...aiSequenceForm, websiteUrl: e.target.value})}
                    placeholder="https://example.com"
                    disabled={isGenerating}
                  />
                  <small style={{ color: '#6b7280' }}>Podaj link do strony firmy klienta (opcjonalnie)</small>
                </div>

                <div className="form-group">
                  <label>Cel sekwencji *</label>
                  <select
                    value={aiSequenceForm.goal}
                    onChange={e => setAiSequenceForm({...aiSequenceForm, goal: e.target.value})}
                    required
                    disabled={isGenerating}
                  >
                    <option value="meeting">Doprowadź do spotkania</option>
                    <option value="discovery">Zbadaj potrzebę / Discovery</option>
                    <option value="sale">Zaproponuj ofertę / Sprzedaż</option>
                    <option value="re_engagement">Wznów kontakt / Re-engagement</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Dodatkowy kontekst</label>
                  <textarea
                    value={aiSequenceForm.additionalContext}
                    onChange={e => setAiSequenceForm({...aiSequenceForm, additionalContext: e.target.value})}
                    placeholder="np. Klient jest zainteresowany rozwiązaniem X, ma budżet Y, rozmawialiśmy o Z..."
                    rows={4}
                    disabled={isGenerating}
                  />
                  <small style={{ color: '#6b7280' }}>Krótkie informacje od handlowca (2-3 zdania)</small>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAISequenceModal(false)} disabled={isSaving || isGenerating}>
                    Anuluj
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving || isGenerating}>
                    {isGenerating ? (
                      <>
                        <span className="spinner" style={{ marginRight: '8px' }}></span>
                        Generuję...
                      </>
                    ) : (
                      <>
                        <Bot size={16} style={{ marginRight: '8px' }} />
                        Generuj sekwencję
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              // Podgląd i edycja wygenerowanej sekwencji
              <div className="modal-body">
                <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{generatedSequence.suggestedSequenceName}</h3>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>{generatedSequence.analysis}</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: '15px' }}>Wygenerowane emaile:</h4>
                  {generatedSequence.emails.map((email, index) => (
                    <div key={index} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px',
                      backgroundColor: '#ffffff'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', color: '#374151' }}>Email #{email.stepNumber}</span>
                        <span style={{ color: '#6b7280', fontSize: '13px' }}>
                          <strong>Opóźnienie:</strong> {email.delay}
                        </span>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Temat:</label>
                        <input
                          type="text"
                          value={email.subject}
                          onChange={e => {
                            const updated = { ...generatedSequence };
                            updated.emails[index].subject = e.target.value;
                            setGeneratedSequence(updated);
                          }}
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Treść:</label>
                        <textarea
                          value={email.body}
                          onChange={e => {
                            const updated = { ...generatedSequence };
                            updated.emails[index].body = e.target.value;
                            setGeneratedSequence(updated);
                          }}
                          rows={6}
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}
                        />
                      </div>

                      {email.reasoning && (
                        <div style={{ padding: '8px', backgroundColor: '#eff6ff', borderRadius: '4px', fontSize: '12px', color: '#1e40af' }}>
                          <strong>Uzasadnienie:</strong> {email.reasoning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setGeneratedSequence(null);
                  }} disabled={isSaving}>
                    <span>↻</span> Regeneruj
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAISequenceModal(false)} disabled={isSaving}>
                    Anuluj
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleAcceptAISequence} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <span className="spinner" style={{ marginRight: '8px' }}></span>
                        Zapisuję...
                      </>
                    ) : (
                      <>
                        <Zap size={16} style={{ marginRight: '8px' }} />
                        Akceptuj i uruchom
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default Deals;
