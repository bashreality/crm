import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { emailsApi, emailAccountsApi, analyticsApi, tasksApi, contactsApi, tagsApi } from '../services/api';
import api from '../services/api';
import EmailModal from '../components/EmailModal';
import TagModal from '../components/TagModal';
import EmailListItem from '../components/EmailListItem';
import '../styles/Dashboard.css'; // Import specific dashboard styles

const Dashboard = () => {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [companies, setCompanies] = useState([]); // Lista firm z kontaktów
  const [emailAccounts, setEmailAccounts] = useState([]); // Lista kont email
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null); // Email do wyświetlenia w modalu
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    contactId: null,
    relatedEmailId: null
  });
  const [contacts, setContacts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all'); // Wybrane konto email ('all' = wszystkie)
  const [statsState, setStatsState] = useState(null); // Statystyki dla bieżącego widoku (konto/all)
  const [filters, setFilters] = useState({
    search: '',
    company: '',
    status: '',
    accountId: '',
    tag: ''
  });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyFormData, setReplyFormData] = useState({
    subject: '',
    body: '',
    emailId: null
  });
  const [loadingAISuggestion, setLoadingAISuggestion] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagContactForEmail, setTagContactForEmail] = useState(null);
  const [compactView, setCompactView] = useState(true);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [emailToChangeStatus, setEmailToChangeStatus] = useState(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [pipelines, setPipelines] = useState([]);
  const [dealForm, setDealForm] = useState({
    title: '',
    value: '',
    currency: 'PLN',
    contactId: '',
    pipelineId: '',
    priority: '3'
  });
  const [isSavingDeal, setIsSavingDeal] = useState(false);

  // Helper Functions
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getInitials = (email) => {
    const emailAddress = email.sender.match(/<(.+?)>/)?.[1] || email.sender;
    const parts = emailAddress.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return emailAddress.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (email) => {
    const emailAddress = email.sender.match(/<(.+?)>/)?.[1] || email.sender;
    const hash = emailAddress.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#3b82f6', '#14b8a6', '#f97316'
    ];
    return colors[hash % colors.length];
  };

  const groupEmailsByDate = (emails) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    emails.forEach(email => {
      const emailDate = new Date(email.receivedAt);
      emailDate.setHours(0, 0, 0, 0);

      if (emailDate.getTime() === today.getTime()) {
        groups.today.push(email);
      } else if (emailDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(email);
      } else if (emailDate >= lastWeek) {
        groups.thisWeek.push(email);
      } else {
        groups.older.push(email);
      }
    });

    return groups;
  };

  const getEmailStatus = (email) => {
    const statuses = [];

    // Status odpowiedzi (najpierw, bo najważniejszy)
    if (email.status === 'positive') {
      statuses.push({ text: 'POZ', label: 'Pozytywna odpowiedź', color: '#10b981' });
    } else if (email.status === 'negative') {
      statuses.push({ text: 'NEG', label: 'Odmowa kontaktu', color: '#ef4444' });
    } else if (email.status === 'neutral') {
      statuses.push({ text: 'NEU', label: 'Do przejrzenia', color: '#6b7280' });
    } else if (email.status === 'auto_reply' || email.status === 'autoReply') {
      statuses.push({ text: 'AUTO', label: 'Automatyczna', color: '#8b5cf6' });
    } else if (email.status === 'undelivered') {
      statuses.push({ text: 'UND', label: 'Niedostarczona', color: '#f97316' });
    } else if (email.status === 'maybeLater') {
      statuses.push({ text: 'PÓŹ', label: 'Może później', color: '#f59e0b' });
    } else if (email.status === 'replied') {
      statuses.push({ text: 'ODP', label: 'Odpowiedziano', color: '#8b5cf6' });
    }

    // Pozostałe statusy
    if (email.isOpened) statuses.push({ text: 'OTW', label: 'Otwarte', color: '#3b82f6' });
    if (email.isClicked) statuses.push({ text: 'KLI', label: 'Kliknięte', color: '#14b8a6' });
    if (email.hasTask) statuses.push({ text: 'ZAD', label: 'Zadanie', color: '#f59e0b' });

    return statuses;
  };

  const toggleEmailSelection = (emailId) => {
    setSelectedEmails(prev =>
      prev.includes(emailId)
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmails.length === filteredEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map(e => e.id));
    }
  };

  useEffect(() => {
    fetchEmails();
    fetchCompanies();
    fetchEmailAccounts();
    fetchContacts();
    fetchTags();
    fetchPipelines();
    // Załaduj statystyki dla domyślnego widoku (wszystkie skrzynki)
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    // Odśwież statystyki gdy zmieni się wybrane konto
    if (selectedAccount === 'all') {
      fetchGlobalStats();
    } else {
      fetchAccountStats(selectedAccount);
    }
  }, [selectedAccount]);

  const fetchGlobalStats = async () => {
    try {
      console.log('fetchGlobalStats: called');
      const response = await analyticsApi.getDashboard();
      // API zwraca pole 'autoReply', więc używamy tej nazwy
      const emailsData = response.data.emails;
      console.log('fetchGlobalStats: API returned autoReply =', emailsData.autoReply);
      // Zmień nazwę pola na 'auto_reply' dla spójności z frontend
      if (emailsData.autoReply) {
        emailsData.auto_reply = emailsData.autoReply;
      }
      setStatsState(emailsData);
      console.log('fetchGlobalStats: setStatsState called with auto_reply =', emailsData.auto_reply);
    } catch (error) {
      console.error('Error fetching global stats:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await emailsApi.getCompanies();
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchEmailAccounts = async () => {
    try {
      const response = await emailAccountsApi.getAll();
      setEmailAccounts(response.data);
    } catch (error) {
      console.error('Error fetching email accounts:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await contactsApi.getAll({ showAll: true });
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await tagsApi.getAll();
      setAllTags(response.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchPipelines = async () => {
    try {
      const response = await api.get('/deals/pipelines');
      setPipelines(response.data);
      // Ustaw domyślny lejek w formularzu
      if (response.data.length > 0) {
        const defaultPipeline = response.data.find(p => p.isDefault) || response.data[0];
        setDealForm(prev => ({ ...prev, pipelineId: defaultPipeline.id.toString() }));
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    }
  };

  const fetchAccountStats = async (accountId) => {
    try {
      const response = await analyticsApi.getAccountStats(accountId);
      setStatsState(response.data);
    } catch (error) {
      console.error('Error fetching account stats:', error);
    }
  };

  const fetchEmails = async (filterParams = {}) => {
    try {
      setLoading(true);
      const response = await emailsApi.getAll(filterParams);
      const sorted = [...response.data].sort(
        (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)
      );
      setEmails(sorted);
      setCurrentPage(1);
      // Jeśli filtrujemy konkretne konto, policz statystyki na podstawie zwróconej listy
      const hasAccountFilter =
        (filterParams.accountId && filterParams.accountId !== 'all') ||
        (filters.accountId && filters.accountId !== '');
      console.log('fetchEmails: hasAccountFilter =', hasAccountFilter, 'filters.accountId =', filters.accountId);
      if (hasAccountFilter) {
        const positive = sorted.filter(e => e.status === 'positive').length;
        const neutral = sorted.filter(e => e.status === 'neutral').length;
        const negative = sorted.filter(e => e.status === 'negative').length;
        const undelivered = sorted.filter(e => e.status === 'undelivered').length;
        const maybeLater = sorted.filter(e => e.status === 'maybeLater').length;
        const auto_reply = sorted.filter(e => e.status === 'auto_reply' || e.status === 'autoReply').length;
        setStatsState({
          positive,
          neutral,
          negative,
          undelivered,
          maybeLater,
          auto_reply,
          total: sorted.length
        });
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildEmailParams = (filtersState) => {
    const params = {};
    if (filtersState.search) params.search = filtersState.search;
    if (filtersState.company) params.company = filtersState.company;
    if (filtersState.status) params.status = filtersState.status;
    if (filtersState.accountId) params.accountId = filtersState.accountId;
    return params;
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setCurrentPage(1);

    fetchEmails(buildEmailParams(newFilters));
  };

  const handleAccountChange = (e) => {
    const accountId = e.target.value;
    setSelectedAccount(accountId);
    setCurrentPage(1);

    const newFilters = {
      ...filters,
      accountId: accountId === 'all' ? '' : accountId
    };
    setFilters(newFilters);

    fetchEmails(buildEmailParams(newFilters));
  };

  const handleFetchEmails = async () => {
    const loadingToast = toast.loading('Pobieranie maili... to może potrwać kilkanaście sekund');
    setFetching(true);
    try {
      const response = await emailsApi.fetchEmails();
      const data = response.data;
      
      if (data.success) {
        toast.success(`Pobrano ${data.newEmails} nowych maili`, { id: loadingToast, duration: 4000 });
        fetchEmails(); // Odśwież listę
        // Odśwież statystyki
        if (selectedAccount === 'all') {
          fetchGlobalStats();
        } else {
          fetchAccountStats(selectedAccount);
        }
        fetchCompanies(); // Odśwież listę firm
      } else {
        toast.error('Błąd: ' + data.message, { id: loadingToast });
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Błąd połączenia: ' + (error.response?.data?.message || error.message), { id: loadingToast });
    } finally {
      setFetching(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      positive: 'Pozytywna',
      neutral: 'Neutralna',
      negative: 'Negatywna',
      undelivered: 'Niedostarczona',
      maybeLater: 'Może później',
      replied: 'Odpowiedziano',
      auto_reply: 'Automatyczna odpowiedź'
    };
    return labels[status] || status;
  };

  const getTrackingIcon = (email) => {
    if (!email.trackingId) return null; // Email received, not tracked (or old sent)
    
    if (email.isOpened) {
      return (
        <span title={`Otwarto: ${email.openedAt ? new Date(email.openedAt).toLocaleString() : '?'} (Liczba otwarć: ${email.openCount})`} 
              style={{ fontSize: '16px', cursor: 'help' }}>
          🟢👁️
        </span>
      );
    } else {
      return (
        <span title="Wysłano, jeszcze nie otworzono" style={{ fontSize: '16px', opacity: 0.5, cursor: 'help' }}>
          ⚪👁️
        </span>
      );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Przed chwilą';
    if (diffInHours < 24) return `${diffInHours} godz. temu`;
    return `${Math.floor(diffInHours / 24)} dni temu`;
  };

  const stats = {
    positive: statsState?.positive || 0,
    neutral: statsState?.neutral || 0,
    negative: statsState?.negative || 0,
    undelivered: statsState?.undelivered || 0,
    maybeLater: statsState?.maybeLater || 0,
    auto_reply: statsState?.auto_reply || 0,
    total: statsState?.total || 0
  };

  // Debug
  console.log('Dashboard render: stats.auto_reply =', stats.auto_reply, 'statsState =', statsState);

  // Filtruj emaile po tagach (jeśli filtr tagu jest aktywny)
  const filteredEmails = filters.tag
    ? emails.filter(email => {
        return email.senderTags && email.senderTags.some(tag => tag.id === parseInt(filters.tag));
      })
    : emails;

  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / pageSize));
  const pagedEmails = filteredEmails.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleStatClick = (status) => {
    const newFilters = { ...filters, status };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchEmails(buildEmailParams(newFilters));
  };

  const handleExportToExcel = () => {
    if (emails.length === 0) {
      alert('Brak maili do eksportu');
      return;
    }

    // Przygotuj dane CSV
    const csvHeader = 'Data;Nadawca;Firma;Temat;Podgląd;Status\n';
    const csvRows = emails.map(email => {
      const date = formatDate(email.receivedAt);
      const sender = email.sender.replace(/;/g, ',');
      const company = email.company.replace(/;/g, ',');
      const subject = email.subject.replace(/;/g, ',');
      const preview = email.preview.replace(/;/g, ',').substring(0, 100);
      const status = getStatusLabel(email.status);
      
      return `${date};${sender};${company};${subject};${preview};${status}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    
    // Dodaj BOM dla polskich znaków
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Pobierz plik
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const statusFilter = filters.status ? `_${filters.status}` : '';
    link.setAttribute('download', `maile${statusFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteEmail = async (emailId, e) => {
    e.stopPropagation(); // Zatrzymaj propagację kliknięcia, aby nie otwierał modala

    if (!window.confirm('Czy na pewno chcesz usunąć ten email?')) {
      return;
    }

    try {
      await emailsApi.delete(emailId);
      // Usuń email z listy lokalnie
      setEmails(emails.filter(email => email.id !== emailId));
      alert('Email został usunięty');
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Błąd podczas usuwania emaila');
    }
  };

  const handleCreateDeal = async (email, e) => {
    e.stopPropagation(); // Zatrzymaj propagację, aby nie otworzyć modala emaila

    // Znajdź kontakt na podstawie emaila nadawcy
    const emailAddress = email.sender.match(/<(.+)>/)?.[1] || email.sender;
    let contact = contacts.find(c => c.email && c.email.toLowerCase() === emailAddress.toLowerCase());

    // Jeśli kontakt nie istnieje, utwórz go automatycznie
    if (!contact) {
      try {
        const namePart = email.sender.replace(/<.*?>/, '').trim();
        let name = namePart || emailAddress.split('@')[0];

        if (name.length < 2) {
          name = name + " " + name;
        }

        const response = await contactsApi.create({
          name: name,
          email: emailAddress,
          company: email.company || 'Nieznana firma',
          phone: ''
        });

        contact = response.data;
        await fetchContacts();
        alert('Kontakt został automatycznie utworzony!');
      } catch (error) {
        console.error('Error creating contact:', error);
        alert('Nie udało się utworzyć kontaktu: ' + (error.response?.data?.message || error.message));
        return;
      }
    }

    // Ustaw formularz z automatycznie wybranym klientem
    setDealForm({
      title: email.subject || 'Nowa szansa',
      value: '',
      currency: 'PLN',
      contactId: contact.id.toString(),
      pipelineId: dealForm.pipelineId, // Zachowaj wybrany lejek
      priority: '3'
    });
    setShowDealModal(true);
  };

  const handleDealSubmit = async (e) => {
    e.preventDefault();

    if (!dealForm.title || !dealForm.contactId || !dealForm.pipelineId) {
      alert('Wypełnij tytuł, klienta i wybierz lejek');
      return;
    }

    setIsSavingDeal(true);
    try {
      const payload = {
        title: dealForm.title,
        value: parseFloat(dealForm.value) || 0,
        currency: dealForm.currency,
        contact: { id: parseInt(dealForm.contactId) },
        pipeline: { id: parseInt(dealForm.pipelineId) },
        priority: parseInt(dealForm.priority)
      };

      const response = await api.post('/deals', payload);
      alert('✅ Szansa została dodana!');
      setShowDealModal(false);
      setDealForm({
        title: '',
        value: '',
        currency: 'PLN',
        contactId: '',
        pipelineId: dealForm.pipelineId, // Zachowaj wybrany lejek
        priority: '3'
      });

      // Zapytaj użytkownika, czy chce przejść do Deals
      if (window.confirm('Czy chcesz przejść do zakładki "Szanse", aby zobaczyć nową szansę?')) {
        // Przekieruj do zakładki Deals
        navigate('/deals');
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      alert('❌ Błąd podczas tworzenia szansy');
    } finally {
      setIsSavingDeal(false);
    }
  };

  const handleTaskFormChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();

    if (!taskFormData.title || !taskFormData.dueDate) {
      alert('Wypełnij tytuł i datę wykonania');
      return;
    }

    try {
      const payload = {
        title: taskFormData.title.trim(),
        description: taskFormData.description?.trim() || null,
        type: 'email',
        dueDate: taskFormData.dueDate ? `${taskFormData.dueDate}:00` : null,
        priority: 2, // Medium priority
        completed: false,
        contact: taskFormData.contactId
          ? { id: Number(taskFormData.contactId) }
          : null,
      };

      await tasksApi.create(payload);
      alert('✅ Zadanie zostało utworzone!');
      setShowTaskModal(false);
      setTaskFormData({
        title: '',
        description: '',
        dueDate: '',
        contactId: null,
        relatedEmailId: null
      });
    } catch (error) {
      console.error('Error creating task:', error);
      alert('❌ Błąd podczas tworzenia zadania');
    }
  };

  const handleReply = (email, e) => {
    e.stopPropagation(); // Zatrzymaj propagację, aby nie otworzyć modala emaila

    setReplyFormData({
      subject: `Re: ${email.subject}`,
      body: '',
      emailId: email.id
    });
    setShowReplyModal(true);
  };

  const handleReplyFormChange = (e) => {
    const { name, value } = e.target;
    setReplyFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGetAISuggestion = async () => {
    if (!replyFormData.emailId) return;

    setLoadingAISuggestion(true);
    try {
      const response = await emailsApi.suggestReply(replyFormData.emailId);
      setReplyFormData(prev => ({
        ...prev,
        subject: response.data.subject,
        body: response.data.suggestion
      }));
      alert('✅ Sugestia AI została załadowana!');
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      alert('❌ Błąd podczas pobierania sugestii AI');
    } finally {
      setLoadingAISuggestion(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();

    if (!replyFormData.subject || !replyFormData.body) {
      alert('Wypełnij temat i treść odpowiedzi');
      return;
    }

    try {
      await emailsApi.sendReply(replyFormData.emailId, {
        subject: replyFormData.subject.trim(),
        body: replyFormData.body.trim()
      });
      alert('✅ Odpowiedź została wysłana!');
      setShowReplyModal(false);
      setReplyFormData({
        subject: '',
        body: '',
        emailId: null
      });
      // Odśwież listę emaili aby pokazać status "replied"
      fetchEmails();
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('❌ Błąd podczas wysyłania odpowiedzi');
    }
  };

  const handleTagEmail = async (email, e) => {
    e.stopPropagation(); // Zatrzymaj propagację, aby nie otworzyć modala emaila

    // Znajdź kontakt na podstawie emaila nadawcy
    // Obsługa formatów: "Name <email@example.com>", "email@example.com", "<email@example.com>"
    let emailAddress = email.sender;
    const match = emailAddress.match(/<(.+?)>/);
    if (match) {
      emailAddress = match[1];
    } else {
      // Usuń ewentualne białe znaki
      emailAddress = emailAddress.trim();
    }

    let contact = contacts.find(c => c.email && c.email.toLowerCase() === emailAddress.toLowerCase());

    if (!contact) {
      // Automatycznie utwórz kontakt
      const confirmCreate = window.confirm(
        `Kontakt dla "${emailAddress}" nie istnieje.\nCzy chcesz utworzyć nowy kontakt?`
      );

      if (!confirmCreate) {
        return;
      }

      try {
        // Wyciągnij nazwę z sender (jeśli jest)
        const namePart = email.sender.replace(/<.*?>/, '').trim();
        let name = namePart || emailAddress.split('@')[0];
        
        // Ensure name is at least 2 characters for validation
        if (name.length < 2) {
            name = name + " " + name; // Duplicate to satisfy min length
        }

        const response = await contactsApi.create({
          name: name,
          email: emailAddress,
          company: email.company || 'Nieznana firma',
          phone: ''
        });

        contact = response.data;
        // Odśwież listę kontaktów
        await fetchContacts();
        alert('Kontakt został utworzony!');
      } catch (error) {
        console.error('Error creating contact:', error);
        alert('Nie udało się utworzyć kontaktu: ' + (error.response?.data?.message || error.message));
        return;
      }
    }

    setTagContactForEmail(contact);
    setShowTagModal(true);
  };

  const handleTagAdded = async () => {
    // Odśwież tylko kontakty - emaile pozostaną bez zmian
    // Po odświeżeniu kontaktów, zaktualizuj tagi w emailach
    try {
      const contactsResponse = await contactsApi.getAll({ showAll: true });
      setContacts(contactsResponse.data);

      // Zaktualizuj tagi w emailach na podstawie nowych danych kontaktów
      const contactMap = new Map();
      contactsResponse.data.forEach(contact => {
        if (contact.email) {
          contactMap.set(contact.email.toLowerCase(), contact);
        }
      });

      // Zaktualizuj tagi w istniejących emailach
      setEmails(prevEmails => prevEmails.map(email => {
        const emailAddress = email.sender.match(/<(.+?)>/)?.[1] || email.sender.trim();
        const contact = contactMap.get(emailAddress.toLowerCase());
        if (contact) {
          return { ...email, senderTags: contact.tags };
        }
        return email;
      }));
    } catch (error) {
      console.error('Error refreshing tags:', error);
    }
  };

  const handleBulkTag = async (tagId) => {
    if (selectedEmails.length === 0) {
      alert('Nie wybrano żadnych emaili');
      return;
    }

    try {
      // Znajdź kontakty dla zaznaczonych emaili
      const emailsToTag = emails.filter(e => selectedEmails.includes(e.id));
      const contactIds = [];

      for (const email of emailsToTag) {
        const emailAddress = email.sender.match(/<(.+?)>/)?.[1] || email.sender.trim();
        const contact = contacts.find(c => c.email && c.email.toLowerCase() === emailAddress.toLowerCase());

        if (!contact) {
          // Utwórz kontakt jeśli nie istnieje
          const namePart = email.sender.replace(/<.*?>/, '').trim();
          let name = namePart || emailAddress.split('@')[0];
          if (name.length < 2) name = name + " " + name;

          const newContact = await contactsApi.create({
            name: name,
            email: emailAddress,
            company: email.company || 'Nieznana firma',
            phone: ''
          });
          contactIds.push(newContact.data.id);
        } else {
          contactIds.push(contact.id);
        }
      }

      // Dodaj tag do kontaktów
      await tagsApi.addToContacts(contactIds, tagId);

      alert(`✅ Dodano tag do ${contactIds.length} kontaktów!`);
      setSelectedEmails([]);
      setShowBulkTagModal(false);

      // Odśwież kontakty i emaile
      await fetchContacts();
      await handleTagAdded();
    } catch (error) {
      console.error('Error bulk tagging:', error);
      alert('❌ Błąd podczas dodawania tagów');
    }
  };

  const handleChangeStatus = async (emailId, newStatus) => {
    try {
      await emailsApi.update(emailId, { status: newStatus });

      // Zaktualizuj email lokalnie
      setEmails(prevEmails => prevEmails.map(email =>
        email.id === emailId ? { ...email, status: newStatus } : email
      ));

      alert('✅ Status został zmieniony!');
      setShowStatusChangeModal(false);
      setEmailToChangeStatus(null);

      // Odśwież statystyki
      if (selectedAccount === 'all') {
        fetchGlobalStats();
      } else {
        fetchAccountStats(selectedAccount);
      }
    } catch (error) {
      console.error('Error changing status:', error);
      alert('❌ Błąd podczas zmiany statusu');
    }
  };

  return (
    <div className="container">
      {selectedEmail && (
        <EmailModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      )}

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Utwórz nowe zadanie</h2>
              <button className="modal-close" onClick={() => setShowTaskModal(false)}>×</button>
            </div>
            <form onSubmit={handleTaskSubmit} className="modal-body">
              <div className="form-group">
                <label htmlFor="taskTitle">Tytuł zadania *</label>
                <input
                  type="text"
                  id="taskTitle"
                  name="title"
                  className="form-control"
                  value={taskFormData.title}
                  onChange={handleTaskFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskDescription">Opis</label>
                <textarea
                  id="taskDescription"
                  name="description"
                  className="form-control"
                  rows="4"
                  value={taskFormData.description}
                  onChange={handleTaskFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskDueDate">Data i godzina wykonania *</label>
                <input
                  type="datetime-local"
                  id="taskDueDate"
                  name="dueDate"
                  className="form-control"
                  value={taskFormData.dueDate}
                  onChange={handleTaskFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskContact">Przypisz do kontaktu</label>
                <select
                  id="taskContact"
                  name="contactId"
                  className="form-control"
                  value={taskFormData.contactId || ''}
                  onChange={handleTaskFormChange}
                >
                  <option value="">Wybierz kontakt (opcjonalnie)</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} ({contact.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  Utwórz zadanie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deal Modal */}
      {showDealModal && (
        <div className="modal-overlay" onClick={() => !isSavingDeal && setShowDealModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Nowa szansa</h2>
              <button className="modal-close" onClick={() => setShowDealModal(false)} disabled={isSavingDeal}>×</button>
            </div>
            <form onSubmit={handleDealSubmit} className="modal-body">
              <div className="form-group">
                <label htmlFor="dealTitle">Tytuł szansy *</label>
                <input
                  type="text"
                  id="dealTitle"
                  className="form-control"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({...dealForm, title: e.target.value})}
                  placeholder="np. Wdrożenie systemu CRM"
                  required
                  disabled={isSavingDeal}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dealPipeline">Lejek sprzedażowy *</label>
                <select
                  id="dealPipeline"
                  className="form-control"
                  value={dealForm.pipelineId}
                  onChange={(e) => setDealForm({...dealForm, pipelineId: e.target.value})}
                  required
                  disabled={isSavingDeal}
                >
                  <option value="">-- Wybierz lejek --</option>
                  {pipelines.map(pipeline => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="dealValue">Wartość</label>
                  <input
                    type="number"
                    id="dealValue"
                    className="form-control"
                    value={dealForm.value}
                    onChange={(e) => setDealForm({...dealForm, value: e.target.value})}
                    placeholder="0"
                    disabled={isSavingDeal}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dealCurrency">Waluta</label>
                  <select
                    id="dealCurrency"
                    className="form-control"
                    value={dealForm.currency}
                    onChange={(e) => setDealForm({...dealForm, currency: e.target.value})}
                    disabled={isSavingDeal}
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dealPriority">Priorytet</label>
                <select
                  id="dealPriority"
                  className="form-control"
                  value={dealForm.priority}
                  onChange={(e) => setDealForm({...dealForm, priority: e.target.value})}
                  disabled={isSavingDeal}
                >
                  <option value="1">Wysoki 🔥</option>
                  <option value="2">Średni ⚡</option>
                  <option value="3">Niski ☕</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="dealContact">Klient *</label>
                <select
                  id="dealContact"
                  className="form-control"
                  value={dealForm.contactId}
                  onChange={(e) => setDealForm({...dealForm, contactId: e.target.value})}
                  required
                  disabled={isSavingDeal}
                >
                  <option value="">-- Wybierz klienta --</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.company ? `(${contact.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDealModal(false)} disabled={isSavingDeal}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSavingDeal}>
                  {isSavingDeal ? 'Tworzenie...' : 'Utwórz szansę'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReplyModal && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Odpowiedz na email</h2>
              <button className="modal-close" onClick={() => setShowReplyModal(false)}>×</button>
            </div>
            <form onSubmit={handleSendReply} className="modal-body">
              <div className="form-group">
                <label htmlFor="replySubject">Temat *</label>
                <input
                  type="text"
                  id="replySubject"
                  name="subject"
                  className="form-control"
                  value={replyFormData.subject}
                  onChange={handleReplyFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="replyBody">Treść odpowiedzi *</label>
                <textarea
                  id="replyBody"
                  name="body"
                  className="form-control"
                  rows="10"
                  value={replyFormData.body}
                  onChange={handleReplyFormChange}
                  required
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleGetAISuggestion}
                  disabled={loadingAISuggestion}
                >
                  {loadingAISuggestion ? '⏳ Ładowanie...' : '🤖 Sugestia AI'}
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReplyModal(false)}>
                    Anuluj
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Wyślij odpowiedź
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <TagModal
        isOpen={showTagModal}
        onClose={() => {
          setShowTagModal(false);
          setTagContactForEmail(null);
        }}
        contact={tagContactForEmail}
        onTagAdded={handleTagAdded}
      />

      {/* Bulk Tag Modal */}
      {showBulkTagModal && (
        <div className="modal-overlay" onClick={() => setShowBulkTagModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Dodaj tag do zaznaczonych emaili</h2>
              <button className="modal-close" onClick={() => setShowBulkTagModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                Wybierz tag do dodania do {selectedEmails.length} zaznaczonych emaili
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {allTags.map(tag => (
                  <button
                    key={tag.id}
                    className="btn btn-secondary"
                    onClick={() => handleBulkTag(tag.id)}
                    style={{
                      justifyContent: 'flex-start',
                      padding: '12px',
                      borderLeft: `4px solid ${tag.color}`
                    }}
                  >
                    <span style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: tag.color,
                      marginRight: '8px'
                    }}></span>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusChangeModal && emailToChangeStatus && (
        <div className="modal-overlay" onClick={() => { setShowStatusChangeModal(false); setEmailToChangeStatus(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Zmień klasyfikację emaila</h2>
              <button className="modal-close" onClick={() => { setShowStatusChangeModal(false); setEmailToChangeStatus(null); }}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                Wybierz nową klasyfikację dla emaila
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleChangeStatus(emailToChangeStatus.id, 'positive')}
                  style={{ justifyContent: 'flex-start', padding: '12px', borderLeft: '4px solid #10b981' }}
                >
                  ✅ Pozytywna odpowiedź
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleChangeStatus(emailToChangeStatus.id, 'neutral')}
                  style={{ justifyContent: 'flex-start', padding: '12px', borderLeft: '4px solid #6b7280' }}
                >
                  ⚪ Do przejrzenia (Neutralna)
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleChangeStatus(emailToChangeStatus.id, 'negative')}
                  style={{ justifyContent: 'flex-start', padding: '12px', borderLeft: '4px solid #ef4444' }}
                >
                  ❌ Odmowa kontaktu (Negatywna)
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleChangeStatus(emailToChangeStatus.id, 'undelivered')}
                  style={{ justifyContent: 'flex-start', padding: '12px', borderLeft: '4px solid #f97316' }}
                >
                  📭 Niedostarczona
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleChangeStatus(emailToChangeStatus.id, 'maybeLater')}
                  style={{ justifyContent: 'flex-start', padding: '12px', borderLeft: '4px solid #f59e0b' }}
                >
                  ⏰ Może później
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="main-layout">
        <aside className="sidebar">
          <h3>Filtry</h3>

          <div className="filter-group">
            <label htmlFor="account">Konto Email</label>
            <select
              id="account"
              name="account"
              className="filter-input"
              value={selectedAccount}
              onChange={handleAccountChange}
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
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="company">Firma</label>
            <select
              id="company"
              name="company"
              className="filter-input"
              value={filters.company}
              onChange={handleFilterChange}
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
              onChange={handleFilterChange}
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
                onClick={() => {
                  setFilters({ ...filters, status: '' });
                  fetchEmails({ ...filters, status: '' });
                }}
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
              onChange={handleFilterChange}
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
                onClick={() => {
                  setFilters({ ...filters, tag: '' });
                  fetchEmails({ ...filters, tag: '' });
                }}
              >
                ✕ Wyczyść filtr
              </button>
            )}
          </div>
        </aside>

        <div className="content-area">
          <div className="stats-grid">
            <div 
              className="stat-card" 
              onClick={() => handleStatClick('positive')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-number positive">{stats.positive}</div>
              <div className="stat-label">Pozytywne odpowiedzi</div>
            </div>
            <div 
              className="stat-card"
              onClick={() => handleStatClick('neutral')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-number neutral">{stats.neutral}</div>
              <div className="stat-label">Do przejrzenia</div>
            </div>
            <div 
              className="stat-card"
              onClick={() => handleStatClick('negative')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-number negative">{stats.negative}</div>
              <div className="stat-label">Odmowy kontaktu</div>
            </div>
            <div
              className="stat-card"
              onClick={() => handleStatClick('undelivered')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-number negative">{stats.undelivered}</div>
              <div className="stat-label">Niedostarczone</div>
            </div>
            <div
              className="stat-card"
              onClick={() => handleStatClick('maybeLater')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-number neutral">{stats.maybeLater}</div>
              <div className="stat-label">Może później</div>
            </div>
            <div
              className="stat-card"
              onClick={() => handleStatClick('auto_reply')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-number negative">{stats.auto_reply}</div>
              <div className="stat-label">Automatyczna odpowiedź</div>
            </div>
          </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  Lista wiadomości
                  {filters.status && (
                    <span style={{ marginLeft: '1rem', fontSize: '0.9rem', color: '#666' }}>
                      (Filtr: {getStatusLabel(filters.status)})
                    </span>
                  )}
                </h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleFetchEmails}
                    disabled={fetching}
                    style={{ height: 'fit-content' }}
                  >
                    {fetching ? '⏳ Pobieranie...' : '📧 Pobierz nowe maile'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleExportToExcel}
                    disabled={emails.length === 0}
                  >
                    📊 Eksport do Excel
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setCompactView(!compactView)}
                    title={compactView ? "Przełącz na rozszerzony widok" : "Przełącz na kompaktowy widok"}
                  >
                    {compactView ? '⬜ Rozszerzony' : '⬛ Kompaktowy'}
                  </button>
                  {selectedEmails.length > 0 && (
                    <span style={{ color: '#6366f1', fontWeight: 600 }}>
                      Zaznaczono: {selectedEmails.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {selectedEmails.length > 0 && (
                <div style={{
                  background: '#eff6ff',
                  borderBottom: '2px solid #3b82f6',
                  padding: '12px 20px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <button
                    className="btn btn-secondary"
                    onClick={toggleSelectAll}
                    style={{ fontSize: '0.9rem' }}
                  >
                    {selectedEmails.length === pagedEmails.length ? '☑️ Odznacz wszystkie' : '☐ Zaznacz wszystkie'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowBulkTagModal(true)}
                    style={{ fontSize: '0.9rem', background: '#dbeafe', color: '#1e40af' }}
                  >
                    🏷️ Dodaj tag
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      if (window.confirm(`Czy na pewno chcesz usunąć ${selectedEmails.length} emaili?`)) {
                        selectedEmails.forEach(id => handleDeleteEmail(id, { stopPropagation: () => {} }));
                        setSelectedEmails([]);
                      }
                    }}
                    style={{ fontSize: '0.9rem', background: '#fee2e2', color: '#ef4444' }}
                  >
                    🗑️ Usuń zaznaczone
                  </button>
                </div>
              )}

              {/* Filter Chips */}
              {(filters.search || filters.company || filters.status || filters.tag) && (
                <div style={{
                  background: '#f9fafb',
                  padding: '12px 20px',
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>Aktywne filtry:</span>
                  {filters.search && (
                    <span style={{
                      background: '#dbeafe',
                      color: '#1e40af',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      Szukaj: "{filters.search}"
                      <button
                        onClick={() => handleFilterChange({ target: { name: 'search', value: '' } })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.company && (
                    <span style={{
                      background: '#dcfce7',
                      color: '#166534',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      Firma: {filters.company}
                      <button
                        onClick={() => handleFilterChange({ target: { name: 'company', value: '' } })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.status && (
                    <span style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      Status: {getStatusLabel(filters.status)}
                      <button
                        onClick={() => handleFilterChange({ target: { name: 'status', value: '' } })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.tag && (
                    <span style={{
                      background: '#e0e7ff',
                      color: '#3730a3',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      Tag: {allTags.find(t => t.id === parseInt(filters.tag))?.name || 'Nieznany'}
                      <button
                        onClick={() => handleFilterChange({ target: { name: 'tag', value: '' } })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}

              <div className="email-list">
                {loading ? (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    Ładowanie...
                  </div>
                ) : emails.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔭</div>
                    <p>Brak wiadomości. Dodaj pierwszą wiadomość!</p>
                  </div>
                ) : (
                  <>
                    {Object.entries(groupEmailsByDate(pagedEmails)).map(([groupKey, groupEmails]) => {
                      if (groupEmails.length === 0) return null;

                      const groupLabels = {
                        today: 'Dzisiaj',
                        yesterday: 'Wczoraj',
                        thisWeek: 'Ten tydzień',
                        older: 'Starsze'
                      };

                      return (
                        <div key={groupKey} style={{ marginBottom: '20px' }}>
                          <div style={{
                            padding: '12px 20px',
                            background: '#f9fafb',
                            borderBottom: '2px solid #e5e7eb',
                            fontWeight: 700,
                            fontSize: '14px',
                            color: '#374151',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                          }}>
                            {groupLabels[groupKey]} ({groupEmails.length})
                          </div>
                          {groupEmails.map((email) => (
                            <EmailListItem
                              key={email.id}
                              email={email}
                              isSelected={selectedEmails.includes(email.id)}
                              compactView={compactView}
                              onSelect={() => toggleEmailSelection(email.id)}
                              onClick={() => setSelectedEmail(email)}
                              onCreateDeal={handleCreateDeal}
                              onTag={handleTagEmail}
                              onReply={handleReply}
                              onDelete={handleDeleteEmail}
                              onChangeStatus={(email, e) => {
                                e.stopPropagation();
                                setEmailToChangeStatus(email);
                                setShowStatusChangeModal(true);
                              }}
                              formatDate={formatDate}
                              getTrackingIcon={getTrackingIcon}
                              truncateText={truncateText}
                              getInitials={getInitials}
                              getAvatarColor={getAvatarColor}
                              getEmailStatus={getEmailStatus}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
              <div className="emails-pagination">
                <div className="emails-pagination-left">
                  <label>
                    Na stronę:{' '}
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      {[5, 10, 15].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="emails-pagination-right">
                  <button
                    className="btn btn-secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    ← Poprzednia
                  </button>
                  <span className="page-label">
                    Strona {Math.min(currentPage, totalPages)} / {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Następna →
                  </button>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
