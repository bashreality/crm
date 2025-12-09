import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Play, 
  Pause, 
  Eye, 
  MousePointer, 
  Users, 
  Plus,
  Edit3,
  Trash2,
  Calendar,
  BarChart2,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  Palette,
  Star,
  Search,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Tag,
  Layers,
  TrendingUp,
  Zap
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api, { tagsApi, emailAccountsApi } from '../services/api';
import emailTemplateService from '../services/emailTemplateService';
import './EmailMarketing.css';

// Newsletter API
const newsletterApi = {
  getCampaigns: () => api.get('/newsletter/campaigns'),
  getCampaign: (id) => api.get(`/newsletter/campaigns/${id}`),
  createCampaign: (data) => api.post('/newsletter/campaigns', data),
  updateCampaign: (id, data) => api.put(`/newsletter/campaigns/${id}`, data),
  prepareCampaign: (id) => api.post(`/newsletter/campaigns/${id}/prepare`),
  startCampaign: (id) => api.post(`/newsletter/campaigns/${id}/start`),
  pauseCampaign: (id) => api.post(`/newsletter/campaigns/${id}/pause`),
  resumeCampaign: (id) => api.post(`/newsletter/campaigns/${id}/resume`),
  sendTestEmail: (id, email) => api.post(`/newsletter/campaigns/${id}/test`, { email }),
  getCampaignStats: (id) => api.get(`/newsletter/campaigns/${id}/stats`),
};

const EmailMarketing = () => {
  // Active tab state
  const [activeTab, setActiveTab] = useState('campaigns');
  
  // Common state
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  
  // Campaigns state
  const [campaigns, setCampaigns] = useState([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  
  // Templates state
  const [templates, setTemplates] = useState([]);
  const [themes, setThemes] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  
  // Send Newsletter State
  const [sendForm, setSendForm] = useState({
    templateId: null,
    templateName: '',
    accountId: '',
    selectedTags: [],
    subject: ''
  });
  const [recipientCount, setRecipientCount] = useState(0);
  const [recipientContacts, setRecipientContacts] = useState([]);
  const [sendPreviewHtml, setSendPreviewHtml] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStep, setSendStep] = useState(1);

  // Campaign form data
  const [campaignFormData, setCampaignFormData] = useState({
    name: '',
    description: '',
    campaignType: 'newsletter',
    subject: '',
    content: '',
    targetTag: null,
    emailAccount: null,
    scheduledAt: '',
    throttlePerHour: 100,
    dailyLimit: 1000,
  });

  // Template form data
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    subject: '',
    previewText: '',
    htmlContent: '',
    plainTextContent: '',
    themeId: null,
    isFavorite: false
  });

  // Theme form data
  const [themeFormData, setThemeFormData] = useState({
    name: '',
    description: '',
    htmlStructure: '',
    cssStyles: '',
    thumbnailUrl: ''
  });

  const categories = [
    { value: 'all', label: 'Wszystkie', icon: '📋' },
    { value: 'newsletter', label: 'Newsletter', icon: '📰' },
    { value: 'follow-up', label: 'Follow-up', icon: '🔄' },
    { value: 'welcome', label: 'Powitanie', icon: '👋' },
    { value: 'promotional', label: 'Promocyjne', icon: '🎯' },
    { value: 'general', label: 'Ogólne', icon: '📧' }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates();
    }
  }, [filter, searchQuery]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, tagsRes, accountsRes, themesRes] = await Promise.all([
        newsletterApi.getCampaigns().catch(() => ({ data: [] })),
        tagsApi.getAll(),
        emailAccountsApi.getAll(),
        emailTemplateService.getAllThemes().catch(() => []),
      ]);
      setCampaigns(campaignsRes.data || []);
      setTags(tagsRes.data || []);
      setEmailAccounts(accountsRes.data || []);
      setThemes(themesRes || []);
      
      // Load templates
      const templatesData = await emailTemplateService.getAllTemplates({});
      setTemplates(templatesData.content || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const params = {};
      if (filter !== 'all') {
        if (filter === 'favorites') {
          params.favoritesOnly = true;
        } else {
          params.category = filter;
        }
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const data = await emailTemplateService.getAllTemplates(params);
      setTemplates(data.content || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // ==================== CAMPAIGN HANDLERS ====================
  
  const handleCampaignSubmit = async (e) => {
    e.preventDefault();

    if (!campaignFormData.name.trim()) {
      toast.error('Nazwa kampanii jest wymagana');
      return;
    }

    try {
      const payload = {
        ...campaignFormData,
        targetTag: campaignFormData.targetTag ? { id: parseInt(campaignFormData.targetTag) } : null,
        emailAccount: campaignFormData.emailAccount ? { id: parseInt(campaignFormData.emailAccount) } : null,
        scheduledAt: campaignFormData.scheduledAt || null,
      };

      if (editingCampaign) {
        await newsletterApi.updateCampaign(editingCampaign.id, payload);
        toast.success('Kampania zaktualizowana');
      } else {
        await newsletterApi.createCampaign(payload);
        toast.success('Kampania utworzona');
      }
      setShowCampaignModal(false);
      resetCampaignForm();
      fetchAllData();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Błąd zapisywania kampanii');
    }
  };

  const handlePrepare = async (campaign) => {
    try {
      await newsletterApi.prepareCampaign(campaign.id);
      toast.success('Kampania przygotowana do wysyłki');
      fetchAllData();
    } catch (error) {
      console.error('Error preparing campaign:', error);
      toast.error('Błąd przygotowywania kampanii');
    }
  };

  const handleStart = async (campaign) => {
    if (!window.confirm('Czy na pewno chcesz rozpocząć wysyłkę kampanii?')) return;
    
    try {
      await newsletterApi.startCampaign(campaign.id);
      toast.success('Wysyłka rozpoczęta');
      fetchAllData();
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast.error('Błąd uruchamiania kampanii');
    }
  };

  const handlePause = async (campaign) => {
    try {
      await newsletterApi.pauseCampaign(campaign.id);
      toast.success('Wysyłka wstrzymana');
      fetchAllData();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Błąd pauzowania kampanii');
    }
  };

  const handleResume = async (campaign) => {
    try {
      await newsletterApi.resumeCampaign(campaign.id);
      toast.success('Wysyłka wznowiona');
      fetchAllData();
    } catch (error) {
      console.error('Error resuming campaign:', error);
      toast.error('Błąd wznawiania kampanii');
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !selectedCampaign) {
      toast.error('Podaj adres email do testu');
      return;
    }

    try {
      await newsletterApi.sendTestEmail(selectedCampaign.id, testEmail);
      toast.success(`Testowy email wysłany na ${testEmail}`);
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Błąd wysyłania testowego emaila');
    }
  };

  const handleViewStats = async (campaign) => {
    setSelectedCampaign(campaign);
    try {
      const res = await newsletterApi.getCampaignStats(campaign.id);
      setCampaignStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setCampaignStats(null);
    }
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setCampaignFormData({
      name: campaign.name || '',
      description: campaign.description || '',
      campaignType: campaign.campaignType || 'newsletter',
      subject: campaign.subject || '',
      content: campaign.content || '',
      targetTag: campaign.targetTag?.id || null,
      emailAccount: campaign.emailAccount?.id || null,
      scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.substring(0, 16) : '',
      throttlePerHour: campaign.throttlePerHour || 100,
      dailyLimit: campaign.dailyLimit || 1000,
    });
    setShowCampaignModal(true);
  };

  const resetCampaignForm = () => {
    setEditingCampaign(null);
    setCampaignFormData({
      name: '',
      description: '',
      campaignType: 'newsletter',
      subject: '',
      content: '',
      targetTag: null,
      emailAccount: null,
      scheduledAt: '',
      throttlePerHour: 100,
      dailyLimit: 1000,
    });
  };

  const openNewCampaignModal = () => {
    resetCampaignForm();
    setShowCampaignModal(true);
  };

  // ==================== TEMPLATE HANDLERS ====================

  const handleOpenSendModal = (template) => {
    setSendForm({
      templateId: template.id,
      templateName: template.name,
      accountId: emailAccounts.length > 0 ? emailAccounts[0].id : '',
      selectedTags: [],
      subject: template.subject || ''
    });
    setRecipientCount(0);
    setRecipientContacts([]);
    setSendPreviewHtml('');
    setSendStep(1);
    setShowSendModal(true);
  };

  const handleTagToggle = async (tagId) => {
    const newTags = sendForm.selectedTags.includes(tagId)
      ? sendForm.selectedTags.filter(id => id !== tagId)
      : [...sendForm.selectedTags, tagId];
    
    setSendForm({ ...sendForm, selectedTags: newTags });
    
    if (newTags.length > 0) {
      try {
        const contactsSet = new Map();
        for (const tId of newTags) {
          const response = await tagsApi.getContactsByTag(tId);
          const contacts = response.data || [];
          contacts.forEach(c => {
            if (c.email) {
              contactsSet.set(c.id, c);
            }
          });
        }
        const uniqueContacts = Array.from(contactsSet.values());
        setRecipientContacts(uniqueContacts);
        setRecipientCount(uniqueContacts.length);
      } catch (error) {
        console.error('Error fetching contacts by tag:', error);
      }
    } else {
      setRecipientContacts([]);
      setRecipientCount(0);
    }
  };

  const handlePreviewNewsletter = async () => {
    if (sendForm.selectedTags.length === 0) {
      toast.error('Wybierz przynajmniej jeden tag');
      return;
    }
    if (!sendForm.accountId) {
      toast.error('Wybierz konto do wysyłki');
      return;
    }
    if (!sendForm.subject.trim()) {
      toast.error('Podaj temat wiadomości');
      return;
    }

    try {
      setLoading(true);
      const sampleContactId = recipientContacts.length > 0 ? recipientContacts[0].id : null;
      const result = await emailTemplateService.previewTemplate(sendForm.templateId, sampleContactId);
      setSendPreviewHtml(result.html);
      setSendStep(2);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Błąd generowania podglądu');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNewsletter = async () => {
    if (recipientCount === 0) {
      toast.error('Brak odbiorców do wysyłki');
      return;
    }

    setIsSending(true);
    try {
      await emailTemplateService.sendNewsletter({
        templateId: sendForm.templateId,
        accountId: Number(sendForm.accountId),
        tagIds: sendForm.selectedTags,
        subject: sendForm.subject
      });
      
      toast.success(`Newsletter wysłany do ${recipientCount} odbiorców!`);
      setShowSendModal(false);
      setSendStep(1);
    } catch (error) {
      console.error('Error sending newsletter:', error);
      toast.error(error.response?.data?.message || 'Błąd wysyłki newslettera');
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setTemplateFormData({
      name: '',
      description: '',
      category: 'general',
      subject: '',
      previewText: '',
      htmlContent: '',
      plainTextContent: '',
      themeId: null,
      isFavorite: false
    });
    setShowTemplateEditor(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      subject: template.subject,
      previewText: template.previewText || '',
      htmlContent: template.htmlContent,
      plainTextContent: template.plainTextContent || '',
      themeId: template.theme?.id || null,
      isFavorite: template.isFavorite
    });
    setShowTemplateEditor(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateFormData.name || templateFormData.name.trim() === '') {
      toast.error('Nazwa szablonu jest wymagana');
      return;
    }
    if (!templateFormData.subject || templateFormData.subject.trim() === '') {
      toast.error('Temat wiadomości jest wymagany');
      return;
    }
    if (!templateFormData.htmlContent || templateFormData.htmlContent.trim() === '') {
      toast.error('Treść HTML jest wymagana');
      return;
    }

    try {
      setLoading(true);
      const templateData = {
        name: templateFormData.name,
        description: templateFormData.description || '',
        category: templateFormData.category || 'general',
        subject: templateFormData.subject,
        previewText: templateFormData.previewText || '',
        htmlContent: templateFormData.htmlContent,
        plainTextContent: templateFormData.plainTextContent || '',
        isFavorite: templateFormData.isFavorite || false,
        theme: templateFormData.themeId ? { id: templateFormData.themeId } : null
      };

      if (selectedTemplate) {
        await emailTemplateService.updateTemplate(selectedTemplate.id, templateData);
        toast.success('Szablon zaktualizowany!');
      } else {
        await emailTemplateService.createTemplate(templateData);
        toast.success('Szablon utworzony!');
      }

      setShowTemplateEditor(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Błąd podczas zapisywania szablonu';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten szablon?')) return;

    try {
      await emailTemplateService.deleteTemplate(id);
      toast.success('Szablon usunięty');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Błąd podczas usuwania szablonu');
    }
  };

  const handleToggleFavorite = async (id) => {
    try {
      await emailTemplateService.toggleFavorite(id);
      loadTemplates();
      toast.success('Zaktualizowano ulubione');
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handlePreview = async (templateId) => {
    try {
      const result = await emailTemplateService.previewTemplate(templateId);
      setPreviewHtml(result.html);
    } catch (error) {
      console.error('Error previewing template:', error);
      toast.error('Błąd podczas podglądu szablonu');
    }
  };

  // ==================== THEME HANDLERS ====================

  const handleCreateTheme = () => {
    setSelectedTheme(null);
    setThemeFormData({
      name: '',
      description: '',
      htmlStructure: defaultHtmlStructure,
      cssStyles: defaultCssStyles,
      thumbnailUrl: ''
    });
    setPreviewDevice('desktop');
    setShowThemeEditor(true);
  };

  const handleEditTheme = (theme) => {
    setSelectedTheme(theme);
    setThemeFormData({
      name: theme.name || '',
      description: theme.description || '',
      htmlStructure: theme.htmlStructure || defaultHtmlStructure,
      cssStyles: theme.cssStyles || defaultCssStyles,
      thumbnailUrl: theme.thumbnailUrl || ''
    });
    setPreviewDevice('desktop');
    setShowThemeEditor(true);
  };

  const handleDeleteTheme = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten motyw?')) return;

    try {
      await emailTemplateService.deleteTheme(id);
      toast.success('Motyw usunięty');
      fetchAllData();
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error('Błąd podczas usuwania motywu. Upewnij się, że żaden szablon nie używa tego motywu.');
    }
  };

  const handleSaveTheme = async () => {
    if (!themeFormData.name.trim()) {
      toast.error('Nazwa motywu jest wymagana');
      return;
    }

    try {
      setLoading(true);
      if (selectedTheme) {
        await emailTemplateService.updateTheme(selectedTheme.id, themeFormData);
        toast.success('Motyw zaktualizowany!');
      } else {
        await emailTemplateService.createTheme(themeFormData);
        toast.success('Motyw utworzony!');
      }
      setShowThemeEditor(false);
      fetchAllData();
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Błąd podczas zapisywania motywu');
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('htmlContent');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = templateFormData.htmlContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setTemplateFormData({
        ...templateFormData,
        htmlContent: before + `{{${variable}}}` + after
      });
    }
  };

  const defaultHtmlStructure = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>{{CSS_STYLES}}</style>
</head>
<body>
    <div class="email-container">
        <div class="header">{{LOGO}}</div>
        <div class="content">{{CONTENT}}</div>
        <div class="footer">{{FOOTER}}</div>
    </div>
</body>
</html>`;

  const defaultCssStyles = `body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
.email-container { max-width: 600px; margin: 0 auto; }
.header { padding: 20px; background-color: #f0f0f0; }
.content { padding: 30px; }
.footer { padding: 20px; background-color: #f0f0f0; text-align: center; }`;

  const generateThemePreviewHtml = () => {
    const html = themeFormData.htmlStructure || defaultHtmlStructure;
    const css = themeFormData.cssStyles || defaultCssStyles;
    
    const sampleContent = `
      <h1>Witaj, {{firstName}}!</h1>
      <p>To jest przykładowa treść Twojego emaila. Możesz tutaj dodać tekst, obrazy i linki.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px;">Przycisk CTA</a>
    `;
    const sampleLogo = '<img src="https://via.placeholder.com/150x50?text=Logo" alt="Logo" style="max-height: 50px;" />';
    const sampleFooter = '<p style="margin:0; color: #6b7280; font-size: 12px;">© 2025 Twoja Firma. Wszystkie prawa zastrzeżone.</p>';
    
    let preview = html
      .replace('{{CSS_STYLES}}', css)
      .replace('{{CONTENT}}', sampleContent)
      .replace('{{LOGO}}', sampleLogo)
      .replace('{{FOOTER}}', sampleFooter);
    
    return preview;
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : '📧';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Szkic', color: '#6b7280', icon: Edit3 },
      scheduled: { label: 'Zaplanowana', color: '#f59e0b', icon: Calendar },
      sending: { label: 'Wysyłanie', color: '#3b82f6', icon: Send },
      paused: { label: 'Wstrzymana', color: '#f97316', icon: Pause },
      completed: { label: 'Zakończona', color: '#10b981', icon: CheckCircle },
      cancelled: { label: 'Anulowana', color: '#ef4444', icon: AlertCircle },
    };

    const config = statusConfig[status] || { label: status, color: '#6b7280', icon: Clock };
    const Icon = config.icon;

    return (
      <span className="status-badge" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
        <Icon size={14} /> {config.label}
      </span>
    );
  };

  // Calculate stats
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.openedCount || 0), 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0;

  return (
    <div className="email-marketing-container">
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div className="em-header">
        <div className="em-header-content">
          <div className="em-header-icon">
            <Mail size={32} />
          </div>
          <div>
            <h1>Marketing</h1>
            <p>Zarządzaj kampaniami, szablonami i motywami email</p>
          </div>
        </div>
        <div className="em-header-actions">
          <button className="btn btn-secondary" onClick={fetchAllData}>
            <RefreshCw size={18} /> Odśwież
          </button>
          {activeTab === 'campaigns' && (
            <button className="btn btn-primary" onClick={openNewCampaignModal}>
              <Plus size={18} /> Nowa kampania
            </button>
          )}
          {activeTab === 'templates' && (
            <button className="btn btn-primary" onClick={handleCreateTemplate}>
              <Plus size={18} /> Nowy szablon
            </button>
          )}
          {activeTab === 'themes' && (
            <button className="btn btn-primary" onClick={handleCreateTheme}>
              <Plus size={18} /> Nowy motyw
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="em-stats-grid">
        <div
          className={`em-stat-card clickable ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          <div className="em-stat-icon campaigns">
            <Layers size={24} />
          </div>
          <div className="em-stat-content">
            <div className="em-stat-value">{campaigns.length}</div>
            <div className="em-stat-label">Kampanie</div>
          </div>
        </div>
        <div
          className={`em-stat-card clickable ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <div className="em-stat-icon templates">
            <FileText size={24} />
          </div>
          <div className="em-stat-content">
            <div className="em-stat-value">{templates.length}</div>
            <div className="em-stat-label">Szablony</div>
          </div>
        </div>
        <div
          className={`em-stat-card clickable ${activeTab === 'themes' ? 'active' : ''}`}
          onClick={() => setActiveTab('themes')}
        >
          <div className="em-stat-icon themes">
            <Palette size={24} />
          </div>
          <div className="em-stat-content">
            <div className="em-stat-value">{themes.length}</div>
            <div className="em-stat-label">Motywy</div>
          </div>
        </div>
        <div className="em-stat-card">
          <div className="em-stat-icon sent">
            <Send size={24} />
          </div>
          <div className="em-stat-content">
            <div className="em-stat-value">{totalSent.toLocaleString()}</div>
            <div className="em-stat-label">Wysłanych</div>
          </div>
        </div>
        <div className="em-stat-card">
          <div className="em-stat-icon rate">
            <TrendingUp size={24} />
          </div>
          <div className="em-stat-content">
            <div className="em-stat-value">{avgOpenRate}%</div>
            <div className="em-stat-label">Śr. Open Rate</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="em-content">
        {/* ==================== CAMPAIGNS TAB ==================== */}
        {activeTab === 'campaigns' && (
          <div className="em-campaigns-section">
            {loading ? (
              <div className="em-loading">
                <RefreshCw size={32} className="spin" />
                <span>Ładowanie kampanii...</span>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="em-empty-state">
                <div className="em-empty-icon">
                  <Layers size={64} />
                </div>
                <h3>Brak kampanii</h3>
                <p>Utwórz pierwszą kampanię, aby rozpocząć wysyłkę newslettera.</p>
                <button className="btn btn-primary" onClick={openNewCampaignModal}>
                  <Plus size={18} /> Utwórz kampanię
                </button>
              </div>
            ) : (
              <div className="em-campaigns-grid">
                {campaigns.map(campaign => (
                  <div key={campaign.id} className="em-campaign-card">
                    <div className="em-campaign-header">
                      <h3>{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>

                    {campaign.description && (
                      <p className="em-campaign-description">{campaign.description}</p>
                    )}

                    <div className="em-campaign-metrics">
                      <div className="em-metric">
                        <Users size={16} />
                        <span>{campaign.totalContacts || 0} kontaktów</span>
                      </div>
                      <div className="em-metric">
                        <Send size={16} />
                        <span>{campaign.sentCount || 0} wysłanych</span>
                      </div>
                      <div className="em-metric">
                        <Eye size={16} />
                        <span>{campaign.openedCount || 0} otwartych</span>
                      </div>
                      <div className="em-metric">
                        <MousePointer size={16} />
                        <span>{campaign.clickedCount || 0} kliknięć</span>
                      </div>
                    </div>

                    {campaign.targetTag && (
                      <div className="em-campaign-tag">
                        <Tag size={14} />
                        <span style={{ backgroundColor: campaign.targetTag.color, color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>
                          {campaign.targetTag.name}
                        </span>
                      </div>
                    )}

                    <div className="em-campaign-actions">
                      {campaign.status === 'draft' && (
                        <>
                          <button className="em-action-btn edit" onClick={() => handleEditCampaign(campaign)} title="Edytuj">
                            <Edit3 size={16} />
                          </button>
                          <button className="em-action-btn prepare" onClick={() => handlePrepare(campaign)} title="Przygotuj">
                            <CheckCircle size={16} />
                          </button>
                        </>
                      )}
                      {campaign.status === 'scheduled' && (
                        <button className="em-action-btn start" onClick={() => handleStart(campaign)} title="Rozpocznij">
                          <Play size={16} />
                        </button>
                      )}
                      {campaign.status === 'sending' && (
                        <button className="em-action-btn pause" onClick={() => handlePause(campaign)} title="Wstrzymaj">
                          <Pause size={16} />
                        </button>
                      )}
                      {campaign.status === 'paused' && (
                        <button className="em-action-btn resume" onClick={() => handleResume(campaign)} title="Wznów">
                          <Play size={16} />
                        </button>
                      )}
                      <button className="em-action-btn stats" onClick={() => handleViewStats(campaign)} title="Statystyki">
                        <BarChart2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TEMPLATES TAB ==================== */}
        {activeTab === 'templates' && (
          <div className="em-templates-section">
            {/* Filters */}
            <div className="em-filters-bar">
              <div className="em-filter-group">
                <label>Kategoria:</label>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                  <option value="favorites">⭐ Ulubione</option>
                </select>
              </div>
              <div className="em-search-group">
                <input
                  type="text"
                  placeholder="Szukaj szablonów..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadTemplates()}
                />
                <button onClick={loadTemplates} className="btn btn-secondary btn-sm">
                  <Search size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="em-loading">
                <RefreshCw size={32} className="spin" />
                <span>Ładowanie szablonów...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="em-empty-state">
                <div className="em-empty-icon">
                  <FileText size={64} />
                </div>
                <h3>Brak szablonów</h3>
                <p>Utwórz pierwszy szablon email.</p>
                <button className="btn btn-primary" onClick={handleCreateTemplate}>
                  <Plus size={18} /> Utwórz szablon
                </button>
              </div>
            ) : (
              <div className="em-templates-grid">
                {templates.map(template => (
                  <div key={template.id} className="em-template-card">
                    <div className="em-template-header">
                      <h3>{template.name}</h3>
                      <button
                        onClick={() => handleToggleFavorite(template.id)}
                        className={`em-btn-icon ${template.isFavorite ? 'favorite' : ''}`}
                        title={template.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                      >
                        <Star size={18} fill={template.isFavorite ? '#fbbf24' : 'none'} />
                      </button>
                    </div>
                    <div className="em-template-meta">
                      <span className="em-category-badge">
                        {getCategoryIcon(template.category)} {template.category}
                      </span>
                      {template.theme && (
                        <span className="em-theme-badge">
                          <Palette size={12} /> {template.theme.name}
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="em-template-description">{template.description}</p>
                    )}
                    <div className="em-template-subject">
                      <strong>Temat:</strong> {template.subject}
                    </div>
                    <div className="em-template-stats">
                      <Zap size={14} /> Użyto: {template.usageCount || 0} razy
                    </div>
                    <div className="em-template-actions">
                      <button onClick={() => handleOpenSendModal(template)} className="btn btn-primary btn-sm" title="Wyślij newsletter">
                        <Send size={14} /> Wyślij
                      </button>
                      <button onClick={() => handlePreview(template.id)} className="btn btn-secondary btn-sm">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleEditTemplate(template)} className="btn btn-secondary btn-sm">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDeleteTemplate(template.id)} className="btn btn-danger btn-sm">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== THEMES TAB ==================== */}
        {activeTab === 'themes' && (
          <div className="em-themes-section">
            {loading ? (
              <div className="em-loading">
                <RefreshCw size={32} className="spin" />
                <span>Ładowanie motywów...</span>
              </div>
            ) : themes.length === 0 ? (
              <div className="em-empty-state">
                <div className="em-empty-icon">
                  <Palette size={64} />
                </div>
                <h3>Brak motywów</h3>
                <p>Utwórz pierwszy motyw graficzny dla szablonów.</p>
                <button className="btn btn-primary" onClick={handleCreateTheme}>
                  <Plus size={18} /> Utwórz motyw
                </button>
              </div>
            ) : (
              <div className="em-themes-grid">
                {themes.map(theme => (
                  <div key={theme.id} className="em-theme-card">
                    <div className="em-theme-preview">
                      {theme.thumbnailUrl ? (
                        <img src={theme.thumbnailUrl} alt={theme.name} />
                      ) : (
                        <div className="em-theme-placeholder">
                          <Sparkles size={32} />
                        </div>
                      )}
                    </div>
                    <div className="em-theme-info">
                      <h4>{theme.name}</h4>
                      {theme.description && <p>{theme.description}</p>}
                      {theme.isSystem && <span className="em-system-badge">Systemowy</span>}
                    </div>
                    <div className="em-theme-actions">
                      <button onClick={() => handleEditTheme(theme)} className="btn btn-secondary btn-sm">
                        <Edit3 size={14} /> Edytuj
                      </button>
                      <button
                        onClick={() => handleDeleteTheme(theme.id)}
                        className="btn btn-danger btn-sm"
                        disabled={theme.isSystem}
                        title={theme.isSystem ? "Nie można usunąć motywu systemowego" : "Usuń motyw"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="modal-overlay" onClick={() => setShowCampaignModal(false)}>
          <div className="modal-content em-campaign-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCampaign ? 'Edytuj kampanię' : 'Nowa kampania'}</h2>
              <button className="modal-close" onClick={() => setShowCampaignModal(false)}>×</button>
            </div>

            <div className="modal-body">
            <form onSubmit={handleCampaignSubmit} className="em-campaign-form">
              <div className="em-form-section">
                <div className="form-group">
                  <label>Nazwa kampanii *</label>
                  <input
                    type="text"
                    value={campaignFormData.name}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, name: e.target.value })}
                    placeholder="np. Newsletter grudniowy"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Opis</label>
                  <textarea
                    value={campaignFormData.description}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, description: e.target.value })}
                    placeholder="Krótki opis kampanii..."
                    rows={2}
                  />
                </div>

                <div className="em-form-row">
                  <div className="form-group">
                    <label>Typ kampanii</label>
                    <select
                      value={campaignFormData.campaignType}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, campaignType: e.target.value })}
                    >
                      <option value="newsletter">Newsletter</option>
                      <option value="promotional">Promocyjna</option>
                      <option value="transactional">Transakcyjna</option>
                      <option value="followup">Follow-up</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Konto email</label>
                    <select
                      value={campaignFormData.emailAccount || ''}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, emailAccount: e.target.value || null })}
                    >
                      <option value="">-- Wybierz konto --</option>
                      {emailAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="em-form-section">
                <h3>Treść</h3>
                
                <div className="form-group">
                  <label>Temat emaila *</label>
                  <input
                    type="text"
                    value={campaignFormData.subject}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, subject: e.target.value })}
                    placeholder="Temat wiadomości..."
                  />
                </div>

                <div className="form-group">
                  <label>Treść emaila (HTML)</label>
                  <textarea
                    value={campaignFormData.content}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, content: e.target.value })}
                    placeholder="<p>Treść HTML...</p>"
                    rows={6}
                  />
                  <small>Możesz użyć zmiennych: {'{{name}}'}, {'{{firstName}}'}, {'{{company}}'}</small>
                </div>
              </div>

              <div className="em-form-section">
                <h3>Odbiorcy i planowanie</h3>

                <div className="em-form-row">
                  <div className="form-group">
                    <label>Tag docelowy</label>
                    <select
                      value={campaignFormData.targetTag || ''}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, targetTag: e.target.value || null })}
                    >
                      <option value="">-- Wszystkie kontakty --</option>
                      {tags.map(tag => (
                        <option key={tag.id} value={tag.id}>{tag.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Zaplanuj wysyłkę</label>
                    <input
                      type="datetime-local"
                      value={campaignFormData.scheduledAt}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, scheduledAt: e.target.value })}
                    />
                  </div>
                </div>

                <div className="em-form-row">
                  <div className="form-group">
                    <label>Limit na godzinę</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={campaignFormData.throttlePerHour}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, throttlePerHour: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Limit dzienny</label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={campaignFormData.dailyLimit}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, dailyLimit: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Preview Panel */}
            <div className="em-campaign-preview-panel">
              <div className="em-campaign-preview-header">
                <h3>Podgląd wiadomości</h3>
              </div>
              <div className="em-campaign-preview-content">
                <div className="em-campaign-preview-frame">
                  <iframe
                    srcDoc={campaignFormData.content || '<p>Treść pojawi się tutaj...</p>'}
                    title="Email Preview"
                  />
                </div>
                <div className="em-campaign-preview-info">
                  Podgląd aktualizuje się na bieżąco wraz z edycją
                </div>
              </div>
            </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCampaignModal(false)}>
                Anuluj
              </button>
              <button type="submit" className="btn btn-primary" onClick={(e) => {
                e.preventDefault();
                document.querySelector('.em-campaign-form')?.dispatchEvent(new Event('submit', { bubbles: true }));
              }}>
                {editingCampaign ? 'Zapisz zmiany' : 'Utwórz kampanię'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Stats Modal */}
      {selectedCampaign && campaignStats && (
        <div className="modal-overlay" onClick={() => { setSelectedCampaign(null); setCampaignStats(null); }}>
          <div className="modal-content em-stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Statystyki: {selectedCampaign.name}</h2>
              <button className="modal-close" onClick={() => { setSelectedCampaign(null); setCampaignStats(null); }}>×</button>
            </div>

            <div className="em-stats-grid-modal">
              <div className="em-stat-item">
                <div className="em-stat-value">{campaignStats.totalContacts || 0}</div>
                <div className="em-stat-label">Odbiorców</div>
              </div>
              <div className="em-stat-item">
                <div className="em-stat-value">{campaignStats.sentCount || 0}</div>
                <div className="em-stat-label">Wysłanych</div>
              </div>
              <div className="em-stat-item">
                <div className="em-stat-value">{campaignStats.pendingCount || 0}</div>
                <div className="em-stat-label">Oczekujących</div>
              </div>
              <div className="em-stat-item highlight">
                <div className="em-stat-value">{(campaignStats.openRate || 0).toFixed(1)}%</div>
                <div className="em-stat-label">Open Rate</div>
              </div>
              <div className="em-stat-item highlight">
                <div className="em-stat-value">{(campaignStats.clickRate || 0).toFixed(1)}%</div>
                <div className="em-stat-label">Click Rate</div>
              </div>
              <div className="em-stat-item danger">
                <div className="em-stat-value">{(campaignStats.bounceRate || 0).toFixed(1)}%</div>
                <div className="em-stat-label">Bounce Rate</div>
              </div>
              <div className="em-stat-item danger">
                <div className="em-stat-value">{(campaignStats.unsubscribeRate || 0).toFixed(1)}%</div>
                <div className="em-stat-label">Unsubscribe Rate</div>
              </div>
            </div>

            {selectedCampaign.status === 'draft' && (
              <div className="em-test-email-section">
                <h3>Wyślij testowy email</h3>
                <div className="em-test-email-form">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Adres email do testu..."
                  />
                  <button className="btn btn-primary" onClick={handleSendTest}>
                    <Send size={16} /> Wyślij test
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Send Newsletter Modal */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal-content" style={{ maxWidth: sendStep === 2 ? '900px' : '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Send size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Wyślij Newsletter: {sendForm.templateName}
              </h2>
              <button onClick={() => setShowSendModal(false)} className="modal-close">×</button>
            </div>
            
            <div className="modal-body">
              {/* Step Indicator */}
              <div className="em-step-indicator">
                {[
                  { num: 1, label: 'Konfiguracja' },
                  { num: 2, label: 'Podgląd' },
                  { num: 3, label: 'Wysyłka' }
                ].map(step => (
                  <div key={step.num} className={`em-step ${sendStep >= step.num ? 'active' : ''}`}>
                    <div className="em-step-number">
                      {sendStep > step.num ? <CheckCircle size={16} /> : step.num}
                    </div>
                    <span className="em-step-label">{step.label}</span>
                  </div>
                ))}
              </div>

              {/* Step 1: Configuration */}
              {sendStep === 1 && (
                <div className="em-send-config">
                  <div className="form-group">
                    <label><Mail size={16} /> Konto wysyłkowe *</label>
                    <select
                      value={sendForm.accountId}
                      onChange={(e) => setSendForm({ ...sendForm, accountId: e.target.value })}
                    >
                      <option value="">-- Wybierz konto --</option>
                      {emailAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.displayName} ({acc.emailAddress})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Temat wiadomości *</label>
                    <input
                      type="text"
                      value={sendForm.subject}
                      onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                      placeholder="Temat newslettera..."
                    />
                  </div>

                  <div className="form-group">
                    <label><Tag size={16} /> Wybierz grupy odbiorców (tagi) *</label>
                    <div className="em-tags-selector">
                      {tags.length === 0 ? (
                        <span className="em-no-tags">Brak dostępnych tagów. Utwórz tagi w sekcji Kontakty.</span>
                      ) : tags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          className={`em-tag-btn ${sendForm.selectedTags.includes(tag.id) ? 'selected' : ''}`}
                        >
                          <span className="em-tag-color" style={{ background: tag.color || '#6b7280' }} />
                          {tag.name}
                          {sendForm.selectedTags.includes(tag.id) && <CheckCircle size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipients Summary */}
                  <div className={`em-recipients-summary ${recipientCount > 0 ? 'has-recipients' : ''}`}>
                    <Users size={24} />
                    <div>
                      <div className="em-recipients-count">{recipientCount} odbiorców</div>
                      <div className="em-recipients-info">
                        {sendForm.selectedTags.length === 0 
                          ? 'Wybierz tagi, aby zobaczyć liczbę odbiorców'
                          : `Z ${sendForm.selectedTags.length} ${sendForm.selectedTags.length === 1 ? 'tagu' : 'tagów'}`
                        }
                      </div>
                    </div>
                  </div>

                  {/* Recipients Preview */}
                  {recipientContacts.length > 0 && (
                    <div className="form-group">
                      <label>Podgląd odbiorców ({Math.min(10, recipientContacts.length)} z {recipientContacts.length})</label>
                      <div className="em-recipients-list">
                        {recipientContacts.slice(0, 10).map(contact => (
                          <div key={contact.id} className="em-recipient-item">
                            <span className="em-recipient-name">{contact.name}</span>
                            <span className="em-recipient-email">{contact.email}</span>
                          </div>
                        ))}
                        {recipientContacts.length > 10 && (
                          <div className="em-recipients-more">...i {recipientContacts.length - 10} więcej</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Preview */}
              {sendStep === 2 && (
                <div className="em-send-preview">
                  <div className="em-preview-info">
                    <div><strong>Temat:</strong> {sendForm.subject}</div>
                    <div className="em-preview-note">Podgląd z danymi pierwszego odbiorcy</div>
                  </div>
                  <div className="em-preview-frame">
                    <iframe
                      srcDoc={sendPreviewHtml}
                      title="Newsletter Preview"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {sendStep === 3 && (
                <div className="em-send-confirm">
                  <div className="em-confirm-icon">
                    <AlertCircle size={40} />
                  </div>
                  <h3>Potwierdź wysyłkę</h3>
                  <p>Czy na pewno chcesz wysłać newsletter <strong>"{sendForm.templateName}"</strong> do <strong>{recipientCount}</strong> odbiorców?</p>
                  <div className="em-confirm-details">
                    <div><strong>Temat:</strong> {sendForm.subject}</div>
                    <div><strong>Konto:</strong> {emailAccounts.find(a => a.id === Number(sendForm.accountId))?.emailAddress}</div>
                    <div><strong>Tagi:</strong> {sendForm.selectedTags.map(id => tags.find(t => t.id === id)?.name).join(', ')}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {sendStep === 1 && (
                <>
                  <button onClick={() => setShowSendModal(false)} className="btn btn-secondary">Anuluj</button>
                  <button 
                    onClick={handlePreviewNewsletter} 
                    className="btn btn-primary"
                    disabled={loading || sendForm.selectedTags.length === 0 || !sendForm.accountId || !sendForm.subject.trim()}
                  >
                    {loading ? 'Generowanie...' : 'Dalej: Podgląd'}
                  </button>
                </>
              )}
              {sendStep === 2 && (
                <>
                  <button onClick={() => setSendStep(1)} className="btn btn-secondary">Wstecz</button>
                  <button onClick={() => setSendStep(3)} className="btn btn-primary">Dalej: Potwierdzenie</button>
                </>
              )}
              {sendStep === 3 && (
                <>
                  <button onClick={() => setSendStep(2)} className="btn btn-secondary" disabled={isSending}>Wstecz</button>
                  <button 
                    onClick={handleSendNewsletter} 
                    className="btn btn-success"
                    disabled={isSending}
                  >
                    {isSending ? 'Wysyłanie...' : `Wyślij do ${recipientCount} odbiorców`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <div className="modal-overlay" onClick={() => setShowTemplateEditor(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTemplate ? 'Edytuj szablon' : 'Nowy szablon'}</h2>
              <button onClick={() => setShowTemplateEditor(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="em-form-grid">
                <div className="form-group">
                  <label>Nazwa szablonu *</label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    placeholder="np. Newsletter Miesięczny"
                  />
                </div>

                <div className="form-group">
                  <label>Kategoria *</label>
                  <select
                    value={templateFormData.category}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                  >
                    {categories.filter(c => c.value !== 'all' && c.value !== 'favorites').map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Opis</label>
                  <textarea
                    value={templateFormData.description}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                    rows="2"
                    placeholder="Krótki opis szablonu"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Temat emaila *</label>
                  <input
                    type="text"
                    value={templateFormData.subject}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                    placeholder="np. {{companyName}} Newsletter - {{month}}"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Tekst podglądu</label>
                  <input
                    type="text"
                    value={templateFormData.previewText}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, previewText: e.target.value })}
                    placeholder="Krótki tekst widoczny w podglądzie emaila"
                  />
                </div>

                <div className="form-group">
                  <label>Motyw graficzny</label>
                  <select
                    value={templateFormData.themeId || ''}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, themeId: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">Bez motywu</option>
                    {themes.map(theme => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name} {theme.isSystem ? '(System)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="isFavorite"
                    checked={templateFormData.isFavorite}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, isFavorite: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="isFavorite" style={{ margin: 0, cursor: 'pointer' }}>
                    Dodaj do ulubionych
                  </label>
                </div>

                <div className="form-group full-width">
                  <label>Treść HTML *</label>
                  <div className="em-variable-buttons">
                    <small>Wstaw zmienną:</small>
                    {['firstName', 'name', 'email', 'company', 'position', 'phone'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="btn btn-xs"
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="htmlContent"
                    value={templateFormData.htmlContent}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, htmlContent: e.target.value })}
                    rows="15"
                    placeholder="<h1>Witaj {{firstName}}!</h1><p>Treść emaila...</p>"
                    className="code-editor"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Wersja tekstowa (opcjonalnie)</label>
                  <textarea
                    value={templateFormData.plainTextContent}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, plainTextContent: e.target.value })}
                    rows="5"
                    placeholder="Wersja tekstowa emaila dla klientów bez HTML"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowTemplateEditor(false)} className="btn btn-secondary">Anuluj</button>
              <button onClick={handleSaveTemplate} className="btn btn-primary" disabled={loading}>
                {loading ? 'Zapisywanie...' : 'Zapisz szablon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Editor Modal */}
      {showThemeEditor && (
        <div className="modal-overlay" onClick={() => setShowThemeEditor(false)}>
          <div className="modal-content em-theme-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTheme ? 'Edytuj motyw' : 'Nowy motyw'}</h2>
              <button onClick={() => setShowThemeEditor(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body em-theme-editor-body">
              {/* Left - Editors */}
              <div className="em-theme-editor-left">
                <div className="em-theme-editor-form">
                  <div className="em-form-row">
                    <div className="form-group">
                      <label>Nazwa motywu *</label>
                      <input
                        type="text"
                        value={themeFormData.name}
                        onChange={(e) => setThemeFormData({ ...themeFormData, name: e.target.value })}
                        placeholder="np. Modern Professional"
                      />
                    </div>

                    <div className="form-group">
                      <label>URL miniaturki</label>
                      <input
                        type="text"
                        value={themeFormData.thumbnailUrl}
                        onChange={(e) => setThemeFormData({ ...themeFormData, thumbnailUrl: e.target.value })}
                        placeholder="https://example.com/thumbnail.png"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Opis</label>
                    <textarea
                      value={themeFormData.description}
                      onChange={(e) => setThemeFormData({ ...themeFormData, description: e.target.value })}
                      rows="2"
                      placeholder="Krótki opis motywu"
                    />
                  </div>

                  <div className="form-group">
                    <div className="em-editor-label-row">
                      <label>Struktura HTML *</label>
                      <span className="em-editor-hint">{'{{CONTENT}}'}, {'{{LOGO}}'}, {'{{FOOTER}}'}, {'{{CSS_STYLES}}'}</span>
                    </div>
                    <textarea
                      value={themeFormData.htmlStructure}
                      onChange={(e) => setThemeFormData({ ...themeFormData, htmlStructure: e.target.value })}
                      rows="12"
                      className="code-editor"
                      placeholder="<!DOCTYPE html>..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Style CSS *</label>
                    <textarea
                      value={themeFormData.cssStyles}
                      onChange={(e) => setThemeFormData({ ...themeFormData, cssStyles: e.target.value })}
                      rows="12"
                      className="code-editor"
                      placeholder="body { ... }"
                    />
                  </div>
                </div>
              </div>

              {/* Right - Live Preview */}
              <div className="em-theme-editor-right">
                <div className="em-preview-panel">
                  <div className="em-preview-header">
                    <span className="em-preview-title">
                      <Eye size={16} /> Podgląd na żywo
                    </span>
                    <div className="em-preview-device-buttons">
                      <button 
                        className={`em-device-btn ${previewDevice === 'desktop' ? 'active' : ''}`} 
                        title="Desktop (650px)"
                        onClick={() => setPreviewDevice('desktop')}
                      >
                        <Monitor size={16} />
                      </button>
                      <button 
                        className={`em-device-btn ${previewDevice === 'tablet' ? 'active' : ''}`} 
                        title="Tablet (480px)"
                        onClick={() => setPreviewDevice('tablet')}
                      >
                        <Tablet size={16} />
                      </button>
                      <button 
                        className={`em-device-btn ${previewDevice === 'mobile' ? 'active' : ''}`} 
                        title="Mobile (375px)"
                        onClick={() => setPreviewDevice('mobile')}
                      >
                        <Smartphone size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="em-preview-frame-container">
                    <iframe
                      srcDoc={generateThemePreviewHtml()}
                      title="Theme Preview"
                      className={`em-theme-preview-iframe preview-${previewDevice}`}
                    />
                  </div>
                  <div className="em-preview-info-bar">
                    <span>Podgląd aktualizuje się automatycznie podczas edycji</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowThemeEditor(false)} className="btn btn-secondary">Anuluj</button>
              <button onClick={handleSaveTheme} className="btn btn-primary" disabled={loading}>
                {loading ? 'Zapisywanie...' : 'Zapisz motyw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="modal-overlay" onClick={() => setPreviewHtml('')}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Podgląd szablonu</h2>
              <button onClick={() => setPreviewHtml('')} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="em-preview-container">
                <iframe
                  srcDoc={previewHtml}
                  title="Email Preview"
                  style={{ width: '100%', height: '600px', border: 'none', borderRadius: '8px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setPreviewHtml('')} className="btn btn-secondary">Zamknij</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailMarketing;