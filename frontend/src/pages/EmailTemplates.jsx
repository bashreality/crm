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
    try {
      setLoading(true);
      const templateData = {
        ...formData,
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
      alert('Błąd podczas zapisywania szablonu');
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
    setShowThemeEditor(true);
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

  return (
    <div className="email-templates-page">
      <div className="page-header">
        <h1>📧 Szablony Email</h1>
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

      {/* Templates Grid */}
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
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTheme ? 'Edytuj Motyw' : 'Nowy Motyw'}</h2>
              <button onClick={() => setShowThemeEditor(false)} className="btn-close">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
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

                <div className="form-group full-width">
                  <label>Opis</label>
                  <textarea
                    value={themeFormData.description}
                    onChange={(e) => setThemeFormData({ ...themeFormData, description: e.target.value })}
                    rows="2"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Struktura HTML *</label>
                  <small>Użyj placeholderów: {'{{CONTENT}}'}, {'{{LOGO}}'}, {'{{FOOTER}}'}, {'{{CSS_STYLES}}'}</small>
                  <textarea
                    value={themeFormData.htmlStructure}
                    onChange={(e) => setThemeFormData({ ...themeFormData, htmlStructure: e.target.value })}
                    rows="10"
                    className="code-editor"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Style CSS *</label>
                  <textarea
                    value={themeFormData.cssStyles}
                    onChange={(e) => setThemeFormData({ ...themeFormData, cssStyles: e.target.value })}
                    rows="10"
                    className="code-editor"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowThemeEditor(false)} className="btn btn-secondary">
                Anuluj
              </button>
              <button onClick={handleSaveTheme} className="btn btn-primary" disabled={loading}>
                {loading ? 'Zapisywanie...' : 'Zapisz Motyw'}
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