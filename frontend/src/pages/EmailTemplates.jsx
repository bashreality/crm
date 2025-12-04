import React, { useState, useEffect } from 'react';
import emailTemplateService from '../services/emailTemplateService';
import './EmailTemplates.css';

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [themes, setThemes] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // desktop, tablet, mobile

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
    { value: 'all', label: 'Wszystkie' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'welcome', label: 'Powitanie' },
    { value: 'promotional', label: 'Promocyjne' },
    { value: 'general', label: 'Ogólne' }
  ];

  useEffect(() => {
    loadTemplates();
    loadThemes();
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
      alert('Błąd podczas ładowania szablonów');
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
    // Validation
    if (!formData.name || formData.name.trim() === '') {
      alert('Nazwa szablonu jest wymagana');
      return;
    }
    if (!formData.subject || formData.subject.trim() === '') {
      alert('Temat wiadomości jest wymagany');
      return;
    }
    if (!formData.htmlContent || formData.htmlContent.trim() === '') {
      alert('Treść HTML jest wymagana');
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
      } else {
        await emailTemplateService.createTemplate(templateData);
      }

      setShowEditor(false);
      loadTemplates();
      alert('Szablon zapisany pomyślnie!');
    } catch (error) {
      console.error('Error saving template:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Błąd podczas zapisywania szablonu';
      alert('Błąd: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten szablon?')) return;

    try {
      await emailTemplateService.deleteTemplate(id);
      loadTemplates();
      alert('Szablon usunięty');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Błąd podczas usuwania szablonu');
    }
  };

  const handleToggleFavorite = async (id) => {
    try {
      await emailTemplateService.toggleFavorite(id);
      loadTemplates();
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
      alert('Błąd podczas podglądu szablonu');
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
      loadThemes();
      alert('Motyw usunięty');
    } catch (error) {
      console.error('Error deleting theme:', error);
      alert('Błąd podczas usuwania motywu. Upewnij się, że żaden szablon nie używa tego motywu.');
    }
  };

  const handleSaveTheme = async () => {
    try {
      setLoading(true);
      if (selectedTheme) {
        await emailTemplateService.updateTheme(selectedTheme.id, themeFormData);
      } else {
        await emailTemplateService.createTheme(themeFormData);
      }
      setShowThemeEditor(false);
      loadThemes();
      alert('Motyw zapisany pomyślnie!');
    } catch (error) {
      console.error('Error saving theme:', error);
      alert('Błąd podczas zapisywania motywu');
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

  // Generowanie podglądu motywu w czasie rzeczywistym
  const generateThemePreviewHtml = () => {
    const html = themeFormData.htmlStructure || defaultHtmlStructure;
    const css = themeFormData.cssStyles || defaultCssStyles;
    
    // Przykładowa treść do podglądu
    const sampleContent = `
      <h1>Witaj, {{firstName}}!</h1>
      <p>To jest przykładowa treść Twojego emaila. Możesz tutaj dodać tekst, obrazy i linki.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px;">Przycisk CTA</a>
    `;
    const sampleLogo = '<img src="https://via.placeholder.com/150x50?text=Logo" alt="Logo" style="max-height: 50px;" />';
    const sampleFooter = '<p style="margin:0; color: #6b7280; font-size: 12px;">© 2025 Twoja Firma. Wszystkie prawa zastrzeżone.</p>';
    
    // Zamiana placeholderów
    let preview = html
      .replace('{{CSS_STYLES}}', css)
      .replace('{{CONTENT}}', sampleContent)
      .replace('{{LOGO}}', sampleLogo)
      .replace('{{FOOTER}}', sampleFooter);
    
    return preview;
  };

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <div className="page-header">
        <h1>Szablony Email</h1>
        <div className="header-actions">
          <button onClick={handleCreateTheme} className="btn btn-secondary">
            🎨 Nowy Motyw
          </button>
          <button onClick={handleCreateTemplate} className="btn btn-primary">
            ➕ Nowy Szablon
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Kategoria:</label>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); loadTemplates(); }}>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
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
          <button onClick={loadTemplates} className="btn btn-sm">🔍</button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="two-column-layout">
        {/* Themes Column */}
        <div className="themes-column">
          <div className="themes-section">
            <div className="themes-header">
              <h2>🎨 Motywy graficzne</h2>
              <span className="themes-count">{themes.length} motywów</span>
              <button onClick={handleCreateTheme} className="btn btn-sm btn-primary themes-add-btn">
                + Dodaj motyw
              </button>
            </div>
        {themes.length === 0 ? (
          <div className="themes-empty">
            <div className="themes-empty-icon">🎨</div>
            <p>Brak motywów graficznych</p>
            <button onClick={handleCreateTheme} className="btn btn-primary">
              + Utwórz pierwszy motyw
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
                    <div className="theme-card-placeholder">🎨</div>
                  )}
                </div>
                <div className="theme-card-info">
                  <h4>{theme.name}</h4>
                  {theme.description && <p>{theme.description}</p>}
                  {theme.isSystem && <span className="system-badge">System</span>}
                </div>
                <div className="theme-card-actions">
                  <button
                    onClick={() => handleEditTheme(theme)}
                    className="btn btn-sm"
                    title="Edytuj motyw"
                  >
                    ✏️ Edytuj
                  </button>
                  <button
                    onClick={() => handleDeleteTheme(theme.id)}
                    className="btn btn-sm btn-danger"
                    title={theme.isSystem ? "Nie można usunąć motywu systemowego" : "Usuń motyw"}
                    disabled={theme.isSystem}
                  >
                    🗑️ Usuń
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
              <h2>📧 Szablony email</h2>
              <span className="templates-count">{templates.length} szablonów</span>
            </div>
        {loading ? (
          <div className="loading">Ładowanie...</div>
        ) : (
          <div className="templates-grid">
            {templates.map(template => (
              <div key={template.id} className="template-card">
                <div className="template-header">
                  <h3>{template.name}</h3>
                  <button
                    onClick={() => handleToggleFavorite(template.id)}
                    className={`btn-icon ${template.isFavorite ? 'favorite' : ''}`}
                  >
                    {template.isFavorite ? '⭐' : '☆'}
                  </button>
                </div>
                <div className="template-meta">
                  <span className="category-badge">{template.category}</span>
                  {template.theme && <span className="theme-badge">🎨 {template.theme.name}</span>}
                </div>
                <p className="template-description">{template.description}</p>
                <div className="template-subject">
                  <strong>Temat:</strong> {template.subject}
                </div>
                <div className="template-stats">
                  <span>📊 Użyto: {template.usageCount || 0}x</span>
                </div>
                <div className="template-actions">
                  <button onClick={() => handlePreview(template.id)} className="btn btn-sm">
                    👁️ Podgląd
                  </button>
                  <button onClick={() => handleEditTemplate(template)} className="btn btn-sm">
                    ✏️ Edytuj
                  </button>
                  <button onClick={() => handleDeleteTemplate(template.id)} className="btn btn-sm btn-danger">
                    🗑️ Usuń
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Template Editor Modal */}
      {showEditor && (
        <div className="modal-overlay" onClick={() => setShowEditor(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTemplate ? 'Edytuj Szablon' : 'Nowy Szablon'}</h2>
              <button onClick={() => setShowEditor(false)} className="btn-close">✕</button>
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
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
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

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isFavorite}
                      onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                    />
                    {' '}Dodaj do ulubionych
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
                        {v}
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
                {loading ? 'Zapisywanie...' : 'Zapisz Szablon'}
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
              <h2>{selectedTheme ? '✏️ Edytuj Motyw' : '🎨 Nowy Motyw'}</h2>
              <button onClick={() => setShowThemeEditor(false)} className="btn-close">✕</button>
            </div>
            <div className="modal-body theme-editor-body">
              {/* Lewa kolumna - Edytory */}
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
                      <label>📄 Struktura HTML *</label>
                      <span className="editor-hint">Placeholdery: {'{{CONTENT}}'}, {'{{LOGO}}'}, {'{{FOOTER}}'}, {'{{CSS_STYLES}}'}</span>
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
                    <div className="editor-label-row">
                      <label>🎨 Style CSS *</label>
                    </div>
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

              {/* Prawa kolumna - Podgląd na żywo */}
              <div className="theme-editor-right">
                <div className="preview-panel">
                  <div className="preview-header">
                    <span className="preview-title">👁️ Podgląd na żywo</span>
                    <div className="preview-device-buttons">
                      <button 
                        className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`} 
                        title="Desktop (650px)"
                        onClick={() => setPreviewDevice('desktop')}
                      >
                        🖥️
                      </button>
                      <button 
                        className={`device-btn ${previewDevice === 'tablet' ? 'active' : ''}`} 
                        title="Tablet (480px)"
                        onClick={() => setPreviewDevice('tablet')}
                      >
                        📱
                      </button>
                      <button 
                        className={`device-btn ${previewDevice === 'mobile' ? 'active' : ''}`} 
                        title="Mobile (375px)"
                        onClick={() => setPreviewDevice('mobile')}
                      >
                        📲
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
                    <span>💡 Podgląd aktualizuje się automatycznie podczas edycji</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowThemeEditor(false)} className="btn btn-secondary">
                Anuluj
              </button>
              <button onClick={handleSaveTheme} className="btn btn-primary" disabled={loading}>
                {loading ? 'Zapisywanie...' : '💾 Zapisz Motyw'}
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
              <h2>Podgląd Szablonu</h2>
              <button onClick={() => setPreviewHtml('')} className="btn-close">✕</button>
            </div>
            <div className="modal-body">
              <div className="preview-container">
                <iframe
                  srcDoc={previewHtml}
                  title="Email Preview"
                  style={{ width: '100%', height: '600px', border: '1px solid #ddd' }}
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