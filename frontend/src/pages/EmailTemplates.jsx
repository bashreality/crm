import React, { useState, useEffect } from 'react';
import { FileText, Palette, Star, Search, Plus, Eye, Edit3, Trash2, Monitor, Tablet, Smartphone, Sparkles, Send, Users, Mail, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import emailTemplateService from '../services/emailTemplateService';
import { tagsApi, emailAccountsApi, contactsApi } from '../services/api';
import './EmailTemplates.css';

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [themes, setThemes] = useState([]);
  const [tags, setTags] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
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
  const [sendStep, setSendStep] = useState(1); // 1: Config, 2: Preview, 3: Confirm

  const [formData, setFormData] = useState({
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
    loadTemplates();
    loadThemes();
    loadTags();
    loadEmailAccounts();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
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
      toast.error('Błąd podczas ładowania szablonów');
    } finally {
      setLoading(false);
    }
  };

  const loadThemes = async () => {
    try {
      const data = await emailTemplateService.getAllThemes();
      setThemes(data);
    } catch (error) {
      console.error('Error loading themes:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await tagsApi.getAll();
      setTags(response.data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadEmailAccounts = async () => {
    try {
      const response = await emailAccountsApi.getAll();
      setEmailAccounts(response.data || []);
    } catch (error) {
      console.error('Error loading email accounts:', error);
    }
  };

  // Newsletter Functions
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
    
    // Fetch contacts for selected tags
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
      // Get preview with first contact as sample
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
    setFormData({
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
    setShowEditor(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({
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
    setShowEditor(true);
  };

  const handleSaveTemplate = async () => {
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Nazwa szablonu jest wymagana');
      return;
    }
    if (!formData.subject || formData.subject.trim() === '') {
      toast.error('Temat wiadomości jest wymagany');
      return;
    }
    if (!formData.htmlContent || formData.htmlContent.trim() === '') {
      toast.error('Treść HTML jest wymagana');
      return;
    }

    try {
      setLoading(true);
      const templateData = {
        name: formData.name,
        description: formData.description || '',
        category: formData.category || 'general',
        subject: formData.subject,
        previewText: formData.previewText || '',
        htmlContent: formData.htmlContent,
        plainTextContent: formData.plainTextContent || '',
        isFavorite: formData.isFavorite || false,
        theme: formData.themeId ? { id: formData.themeId } : null
      };

      if (selectedTemplate) {
        await emailTemplateService.updateTemplate(selectedTemplate.id, templateData);
        toast.success('Szablon zaktualizowany!');
      } else {
        await emailTemplateService.createTemplate(templateData);
        toast.success('Szablon utworzony!');
      }

      setShowEditor(false);
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
      loadThemes();
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
      loadThemes();
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
      const text = formData.htmlContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setFormData({
        ...formData,
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

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Szablony Email</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Zarządzaj szablonami i wysyłaj newslettery do grup kontaktów
          </p>
        </div>
        <div className="header-actions">
          <button onClick={handleCreateTheme} className="btn btn-secondary">
            <Palette size={16} />
            Nowy Motyw
          </button>
          <button onClick={handleCreateTemplate} className="btn btn-primary">
            <Plus size={16} />
            Nowy Szablon
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Kategoria:</label>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setTimeout(loadTemplates, 0); }}>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
            <option value="favorites">⭐ Ulubione</option>
          </select>
        </div>
        <div className="search-group">
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

      {/* Two Column Layout */}
      <div className="two-column-layout">
        {/* Themes Column */}
        <div className="themes-column">
          <div className="themes-section">
            <div className="themes-header">
              <Palette size={20} style={{ color: 'var(--color-primary)' }} />
              <h2>Motywy</h2>
              <span className="themes-count">{themes.length}</span>
            </div>
            
            {themes.length === 0 ? (
              <div className="themes-empty">
                <div className="themes-empty-icon"><Palette size={40} /></div>
                <p>Brak motywów graficznych</p>
                <button onClick={handleCreateTheme} className="btn btn-primary btn-sm">
                  <Plus size={14} /> Utwórz motyw
                </button>
              </div>
            ) : (
              <div className="themes-grid">
                {themes.map(theme => (
                  <div key={theme.id} className="theme-card">
                    <div className="theme-card-preview">
                      {theme.thumbnailUrl ? (
                        <img src={theme.thumbnailUrl} alt={theme.name} />
                      ) : (
                        <div className="theme-card-placeholder">
                          <Sparkles size={24} color="white" />
                        </div>
                      )}
                    </div>
                    <div className="theme-card-info">
                      <h4>{theme.name}</h4>
                      {theme.description && <p>{theme.description}</p>}
                      {theme.isSystem && <span className="system-badge">Systemowy</span>}
                    </div>
                    <div className="theme-card-actions">
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
        </div>

        {/* Templates Column */}
        <div className="templates-column">
          <div className="templates-section">
            <div className="templates-header">
              <FileText size={20} style={{ color: 'var(--color-primary)' }} />
              <h2>Szablony</h2>
              <span className="templates-count">{templates.length}</span>
            </div>
            
            {loading ? (
              <div className="loading">
                <div style={{ marginBottom: '12px' }}>⏳</div>
                Ładowanie szablonów...
              </div>
            ) : templates.length === 0 ? (
              <div className="themes-empty">
                <div className="themes-empty-icon"><FileText size={40} /></div>
                <p>Brak szablonów email</p>
                <button onClick={handleCreateTemplate} className="btn btn-primary btn-sm">
                  <Plus size={14} /> Utwórz szablon
                </button>
              </div>
            ) : (
              <div className="templates-grid">
                {templates.map(template => (
                  <div key={template.id} className="template-card">
                    <div className="template-header">
                      <h3>{template.name}</h3>
                      <button
                        onClick={() => handleToggleFavorite(template.id)}
                        className={`btn-icon ${template.isFavorite ? 'favorite' : ''}`}
                        title={template.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                      >
                        <Star size={18} fill={template.isFavorite ? '#fbbf24' : 'none'} />
                      </button>
                    </div>
                    <div className="template-meta">
                      <span className="category-badge">
                        {getCategoryIcon(template.category)} {template.category}
                      </span>
                      {template.theme && (
                        <span className="theme-badge">
                          <Palette size={12} /> {template.theme.name}
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="template-description">{template.description}</p>
                    )}
                    <div className="template-subject">
                      <strong>Temat:</strong> {template.subject}
                    </div>
                    <div className="template-stats">
                      Użyto: {template.usageCount || 0} razy
                    </div>
                    <div className="template-actions">
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
        </div>
      </div>

      {/* Send Newsletter Modal */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal-content" style={{ maxWidth: sendStep === 2 ? '900px' : '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Send size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Wyślij Newsletter: {sendForm.templateName}
              </h2>
              <button onClick={() => setShowSendModal(false)} className="btn-close">×</button>
            </div>
            
            <div className="modal-body">
              {/* Step Indicator */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '32px', 
                marginBottom: '24px',
                padding: '16px',
                background: 'var(--color-bg-elevated)',
                borderRadius: '12px'
              }}>
                {[
                  { num: 1, label: 'Konfiguracja' },
                  { num: 2, label: 'Podgląd' },
                  { num: 3, label: 'Wysyłka' }
                ].map(step => (
                  <div key={step.num} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    opacity: sendStep >= step.num ? 1 : 0.4
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: sendStep >= step.num ? 'var(--color-primary)' : 'var(--color-border)',
                      color: sendStep >= step.num ? 'white' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      {sendStep > step.num ? <CheckCircle size={16} /> : step.num}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-main)' }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Step 1: Configuration */}
              {sendStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label><Mail size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Konto wysyłkowe *</label>
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
                    <label>
                      <Tag size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> 
                      Wybierz grupy odbiorców (tagi) *
                    </label>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '8px',
                      padding: '12px',
                      background: 'var(--color-bg-elevated)',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      minHeight: '60px'
                    }}>
                      {tags.length === 0 ? (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                          Brak dostępnych tagów. Utwórz tagi w sekcji Kontakty.
                        </span>
                      ) : tags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: sendForm.selectedTags.includes(tag.id) 
                              ? '2px solid var(--color-primary)' 
                              : '1px solid var(--color-border)',
                            background: sendForm.selectedTags.includes(tag.id) 
                              ? 'var(--color-primary-light)' 
                              : 'var(--color-bg-surface)',
                            color: sendForm.selectedTags.includes(tag.id) 
                              ? 'var(--color-primary)' 
                              : 'var(--color-text-main)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: tag.color || '#6b7280'
                          }} />
                          {tag.name}
                          {sendForm.selectedTags.includes(tag.id) && <CheckCircle size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipients Summary */}
                  <div style={{
                    padding: '16px',
                    background: recipientCount > 0 ? 'var(--color-success-light)' : 'var(--color-bg-elevated)',
                    borderRadius: '12px',
                    border: `1px solid ${recipientCount > 0 ? 'var(--color-success)' : 'var(--color-border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <Users size={24} style={{ color: recipientCount > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }} />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '18px', color: 'var(--color-text-main)' }}>
                        {recipientCount} {recipientCount === 1 ? 'odbiorca' : recipientCount < 5 ? 'odbiorców' : 'odbiorców'}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
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
                      <div style={{
                        maxHeight: '150px',
                        overflowY: 'auto',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        background: 'var(--color-bg-surface)'
                      }}>
                        {recipientContacts.slice(0, 10).map(contact => (
                          <div key={contact.id} style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '13px'
                          }}>
                            <span style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>{contact.name}</span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>{contact.email}</span>
                          </div>
                        ))}
                        {recipientContacts.length > 10 && (
                          <div style={{ padding: '8px 12px', color: 'var(--color-text-muted)', fontSize: '12px', textAlign: 'center' }}>
                            ...i {recipientContacts.length - 10} więcej
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Preview */}
              {sendStep === 2 && (
                <div>
                  <div style={{ 
                    marginBottom: '16px', 
                    padding: '12px', 
                    background: 'var(--color-bg-elevated)', 
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong>Temat:</strong> {sendForm.subject}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      Podgląd z danymi pierwszego odbiorcy
                    </div>
                  </div>
                  <div style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: 'white'
                  }}>
                    <iframe
                      srcDoc={sendPreviewHtml}
                      title="Newsletter Preview"
                      style={{ width: '100%', height: '500px', border: 'none' }}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {sendStep === 3 && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    margin: '0 auto 20px',
                    background: 'var(--color-warning-light)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AlertCircle size={40} style={{ color: 'var(--color-warning)' }} />
                  </div>
                  <h3 style={{ marginBottom: '12px', color: 'var(--color-text-main)' }}>Potwierdź wysyłkę</h3>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                    Czy na pewno chcesz wysłać newsletter <strong>"{sendForm.templateName}"</strong> do <strong>{recipientCount}</strong> odbiorców?
                  </p>
                  <div style={{ 
                    background: 'var(--color-bg-elevated)', 
                    padding: '16px', 
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'left'
                  }}>
                    <div style={{ marginBottom: '8px' }}><strong>Temat:</strong> {sendForm.subject}</div>
                    <div style={{ marginBottom: '8px' }}><strong>Konto:</strong> {emailAccounts.find(a => a.id === Number(sendForm.accountId))?.emailAddress}</div>
                    <div><strong>Tagi:</strong> {sendForm.selectedTags.map(id => tags.find(t => t.id === id)?.name).join(', ')}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {sendStep === 1 && (
                <>
                  <button onClick={() => setShowSendModal(false)} className="btn btn-secondary">
                    Anuluj
                  </button>
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
                  <button onClick={() => setSendStep(1)} className="btn btn-secondary">
                    Wstecz
                  </button>
                  <button onClick={() => setSendStep(3)} className="btn btn-primary">
                    Dalej: Potwierdzenie
                  </button>
                </>
              )}
              {sendStep === 3 && (
                <>
                  <button onClick={() => setSendStep(2)} className="btn btn-secondary" disabled={isSending}>
                    Wstecz
                  </button>
                  <button 
                    onClick={handleSendNewsletter} 
                    className="btn btn-primary"
                    disabled={isSending}
                    style={{ background: 'var(--color-success)' }}
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
      {showEditor && (
        <div className="modal-overlay" onClick={() => setShowEditor(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTemplate ? 'Edytuj szablon' : 'Nowy szablon'}</h2>
              <button onClick={() => setShowEditor(false)} className="btn-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nazwa szablonu *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="np. Newsletter Miesięczny"
                  />
                </div>

                <div className="form-group">
                  <label>Kategoria *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.filter(c => c.value !== 'all' && c.value !== 'favorites').map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Opis</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="2"
                    placeholder="Krótki opis szablonu"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Temat emaila *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="np. {{companyName}} Newsletter - {{month}}"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Tekst podglądu</label>
                  <input
                    type="text"
                    value={formData.previewText}
                    onChange={(e) => setFormData({ ...formData, previewText: e.target.value })}
                    placeholder="Krótki tekst widoczny w podglądzie emaila"
                  />
                </div>

                <div className="form-group">
                  <label>Motyw graficzny</label>
                  <select
                    value={formData.themeId || ''}
                    onChange={(e) => setFormData({ ...formData, themeId: e.target.value ? parseInt(e.target.value) : null })}
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
                    checked={formData.isFavorite}
                    onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="isFavorite" style={{ margin: 0, cursor: 'pointer' }}>
                    Dodaj do ulubionych
                  </label>
                </div>

                <div className="form-group full-width">
                  <label>Treść HTML *</label>
                  <div className="variable-buttons">
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
                    value={formData.htmlContent}
                    onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                    rows="15"
                    placeholder="<h1>Witaj {{firstName}}!</h1><p>Treść emaila...</p>"
                    className="code-editor"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Wersja tekstowa (opcjonalnie)</label>
                  <textarea
                    value={formData.plainTextContent}
                    onChange={(e) => setFormData({ ...formData, plainTextContent: e.target.value })}
                    rows="5"
                    placeholder="Wersja tekstowa emaila dla klientów bez HTML"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowEditor(false)} className="btn btn-secondary">
                Anuluj
              </button>
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
          <div className="modal-content theme-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTheme ? 'Edytuj motyw' : 'Nowy motyw'}</h2>
              <button onClick={() => setShowThemeEditor(false)} className="btn-close">×</button>
            </div>
            <div className="modal-body theme-editor-body">
              {/* Left - Editors */}
              <div className="theme-editor-left">
                <div className="theme-editor-form">
                  <div className="form-row">
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
                    <div className="editor-label-row">
                      <label>Struktura HTML *</label>
                      <span className="editor-hint">{'{{CONTENT}}'}, {'{{LOGO}}'}, {'{{FOOTER}}'}, {'{{CSS_STYLES}}'}</span>
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
              <div className="theme-editor-right">
                <div className="preview-panel">
                  <div className="preview-header">
                    <span className="preview-title">
                      <Eye size={16} /> Podgląd na żywo
                    </span>
                    <div className="preview-device-buttons">
                      <button 
                        className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`} 
                        title="Desktop (650px)"
                        onClick={() => setPreviewDevice('desktop')}
                      >
                        <Monitor size={16} />
                      </button>
                      <button 
                        className={`device-btn ${previewDevice === 'tablet' ? 'active' : ''}`} 
                        title="Tablet (480px)"
                        onClick={() => setPreviewDevice('tablet')}
                      >
                        <Tablet size={16} />
                      </button>
                      <button 
                        className={`device-btn ${previewDevice === 'mobile' ? 'active' : ''}`} 
                        title="Mobile (375px)"
                        onClick={() => setPreviewDevice('mobile')}
                      >
                        <Smartphone size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="preview-frame-container">
                    <iframe
                      srcDoc={generateThemePreviewHtml()}
                      title="Theme Preview"
                      className={`theme-preview-iframe preview-${previewDevice}`}
                    />
                  </div>
                  <div className="preview-info">
                    <span>Podgląd aktualizuje się automatycznie podczas edycji</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowThemeEditor(false)} className="btn btn-secondary">
                Anuluj
              </button>
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
              <button onClick={() => setPreviewHtml('')} className="btn-close">×</button>
            </div>
            <div className="modal-body">
              <div className="preview-container">
                <iframe
                  srcDoc={previewHtml}
                  title="Email Preview"
                  style={{ width: '100%', height: '600px', border: 'none', borderRadius: '8px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setPreviewHtml('')} className="btn btn-secondary">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
