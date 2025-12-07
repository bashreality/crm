import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit3,
  Mail,
  Tag,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workflowsApi, sequencesApi, tagsApi, dealsApi, emailAccountsApi } from '../services/api';
import emailTemplateService from '../services/emailTemplateService';
import '../styles/Automations.css';

// Mapowanie typów triggerów na czytelne nazwy
const TRIGGER_LABELS = {
  EMAIL_OPENED: { label: 'Email otwarty', icon: Mail, color: '#3b82f6' },
  EMAIL_CLICKED: { label: 'Link kliknięty', icon: Target, color: '#8b5cf6' },
  NO_REPLY: { label: 'Brak odpowiedzi', icon: Clock, color: '#f59e0b' },
  POSITIVE_REPLY: { label: 'Pozytywna odpowiedź', icon: CheckCircle, color: '#10b981' },
  NEGATIVE_REPLY: { label: 'Negatywna odpowiedź', icon: XCircle, color: '#ef4444' },
  ANY_REPLY: { label: 'Jakakolwiek odpowiedź', icon: Mail, color: '#6366f1' },
  TAG_ADDED: { label: 'Tag dodany', icon: Tag, color: '#14b8a6' },
  TAG_REMOVED: { label: 'Tag usunięty', icon: Tag, color: '#f97316' },
  DEAL_STAGE_CHANGED: { label: 'Zmiana etapu szansy', icon: Activity, color: '#ec4899' },
  DEAL_WON: { label: 'Szansa wygrana', icon: CheckCircle, color: '#10b981' },
  DEAL_LOST: { label: 'Szansa przegrana', icon: XCircle, color: '#ef4444' },
  CONTACT_CREATED: { label: 'Nowy kontakt', icon: Plus, color: '#6366f1' },
  LEAD_SCORE_CHANGED: { label: 'Zmiana scoringu', icon: Activity, color: '#f59e0b' },
  SEQUENCE_COMPLETED: { label: 'Sekwencja zakończona', icon: CheckCircle, color: '#10b981' },
};

const ACTION_LABELS = {
  START_SEQUENCE: { label: 'Uruchom sekwencję', icon: Play, color: '#10b981' },
  STOP_SEQUENCE: { label: 'Zatrzymaj sekwencję', icon: Pause, color: '#f59e0b' },
  CREATE_TASK: { label: 'Utwórz zadanie', icon: CheckCircle, color: '#3b82f6' },
  MOVE_DEAL: { label: 'Przenieś szansę', icon: Target, color: '#8b5cf6' },
  CREATE_DEAL: { label: 'Utwórz szansę', icon: Plus, color: '#6366f1' },
  ADD_TAG: { label: 'Dodaj tag', icon: Tag, color: '#14b8a6' },
  REMOVE_TAG: { label: 'Usuń tag', icon: Tag, color: '#f97316' },
  UPDATE_LEAD_SCORE: { label: 'Zmień scoring', icon: Activity, color: '#f59e0b' },
  SEND_NOTIFICATION: { label: 'Wyślij powiadomienie', icon: Mail, color: '#ec4899' },
  SEND_EMAIL: { label: 'Wyślij email z szablonu', icon: FileText, color: '#3b82f6' },
};

const Automations = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [expandedRuleId, setExpandedRuleId] = useState(null);
  const [sequences, setSequences] = useState([]);
  const [tags, setTags] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [stats, setStats] = useState({ totalRules: 0, totalExecutions: 0 });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'EMAIL_OPENED',
    triggerConfig: {},
    actionType: 'CREATE_TASK',
    actionConfig: {},
    active: true,
    priority: 100,
    allowMultipleExecutions: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, seqRes, tagsRes, pipelinesRes, dashRes, templatesRes, accountsRes] = await Promise.all([
        workflowsApi.getAllRules(),
        sequencesApi.getAll(),
        tagsApi.getAll(),
        dealsApi.getAllPipelines().catch(() => ({ data: [] })),
        workflowsApi.getDashboard().catch(() => ({ data: { totalRules: 0, totalExecutions: 0 } })),
        emailTemplateService.getAllTemplates().catch(() => []),
        emailAccountsApi.getAll().catch(() => ({ data: [] })),
      ]);
      setRules(rulesRes.data || []);
      setSequences(seqRes.data || []);
      setTags(tagsRes.data || []);
      setPipelines(pipelinesRes.data || []);
      setStats(dashRes.data || { totalRules: 0, totalExecutions: 0 });
      setTemplates(templatesRes || []);
      setEmailAccounts(accountsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nazwa automatyzacji jest wymagana');
      return;
    }

    try {
      if (editingRule) {
        await workflowsApi.updateRule(editingRule.id, formData);
        toast.success('Automatyzacja zaktualizowana');
      } else {
        await workflowsApi.createRule(formData);
        toast.success('Automatyzacja utworzona');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Błąd zapisywania automatyzacji');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę automatyzację?')) return;

    try {
      await workflowsApi.deleteRule(id);
      toast.success('Automatyzacja usunięta');
      fetchData();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Błąd usuwania automatyzacji');
    }
  };

  const handleToggle = async (id) => {
    try {
      await workflowsApi.toggleRule(id);
      fetchData();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Błąd zmiany statusu');
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name || '',
      description: rule.description || '',
      triggerType: rule.triggerType || 'EMAIL_OPENED',
      triggerConfig: rule.triggerConfig || {},
      actionType: rule.actionType || 'CREATE_TASK',
      actionConfig: rule.actionConfig || {},
      active: rule.active !== false,
      priority: rule.priority || 100,
      allowMultipleExecutions: rule.allowMultipleExecutions || false,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      triggerType: 'EMAIL_OPENED',
      triggerConfig: {},
      actionType: 'CREATE_TASK',
      actionConfig: {},
      active: true,
      priority: 100,
      allowMultipleExecutions: false,
    });
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const renderTriggerConfig = () => {
    const { triggerType, triggerConfig } = formData;

    switch (triggerType) {
      case 'NO_REPLY':
        return (
          <div className="config-field">
            <label>Dni bez odpowiedzi</label>
            <input
              type="number"
              min="1"
              max="30"
              value={triggerConfig.days || 3}
              onChange={(e) => setFormData({
                ...formData,
                triggerConfig: { ...triggerConfig, days: parseInt(e.target.value) }
              })}
            />
          </div>
        );
      case 'TAG_ADDED':
      case 'TAG_REMOVED':
        return (
          <div className="config-field">
            <label>Wybierz tag</label>
            <select
              value={triggerConfig.tagId || ''}
              onChange={(e) => {
                const value = e.target.value;
                const newConfig = { ...triggerConfig };
                if (value) {
                  newConfig.tagId = parseInt(value);
                } else {
                  delete newConfig.tagId; // Usuń tagId gdy wybrano "Wszystkie tagi"
                }
                setFormData({
                  ...formData,
                  triggerConfig: newConfig
                });
              }}
            >
              <option value="">-- Wszystkie tagi --</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
        );
      case 'LEAD_SCORE_CHANGED':
        return (
          <>
            <div className="config-field">
              <label>Próg górny (przekroczenie)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={triggerConfig.thresholdAbove || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  triggerConfig: { 
                    ...triggerConfig, 
                    thresholdAbove: e.target.value ? parseInt(e.target.value) : undefined 
                  }
                })}
                placeholder="np. 70"
              />
            </div>
            <div className="config-field">
              <label>Próg dolny (spadek poniżej)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={triggerConfig.thresholdBelow || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  triggerConfig: { 
                    ...triggerConfig, 
                    thresholdBelow: e.target.value ? parseInt(e.target.value) : undefined 
                  }
                })}
                placeholder="np. 30"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderActionConfig = () => {
    const { actionType, actionConfig } = formData;

    switch (actionType) {
      case 'START_SEQUENCE':
      case 'STOP_SEQUENCE':
        return (
          <div className="config-field">
            <label>Wybierz sekwencję</label>
            <select
              value={actionConfig.sequenceId || ''}
              onChange={(e) => setFormData({
                ...formData,
                actionConfig: { ...actionConfig, sequenceId: parseInt(e.target.value) }
              })}
              required
            >
              <option value="">-- Wybierz sekwencję --</option>
              {sequences.map(seq => (
                <option key={seq.id} value={seq.id}>{seq.name}</option>
              ))}
            </select>
          </div>
        );
      case 'CREATE_TASK':
        return (
          <>
            <div className="config-field">
              <label>Tytuł zadania</label>
              <input
                type="text"
                value={actionConfig.title || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  actionConfig: { ...actionConfig, title: e.target.value }
                })}
                placeholder="np. Zadzwonić do klienta"
              />
            </div>
            <div className="config-field">
              <label>Typ zadania</label>
              <select
                value={actionConfig.type || 'todo'}
                onChange={(e) => setFormData({
                  ...formData,
                  actionConfig: { ...actionConfig, type: e.target.value }
                })}
              >
                <option value="todo">Do zrobienia</option>
                <option value="call">Telefon</option>
                <option value="email">Email</option>
                <option value="meeting">Spotkanie</option>
              </select>
            </div>
            <div className="config-field">
              <label>Priorytet</label>
              <select
                value={actionConfig.priority || 2}
                onChange={(e) => setFormData({
                  ...formData,
                  actionConfig: { ...actionConfig, priority: parseInt(e.target.value) }
                })}
              >
                <option value={1}>Wysoki</option>
                <option value={2}>Średni</option>
                <option value={3}>Niski</option>
              </select>
            </div>
            <div className="config-field">
              <label>Termin (dni od teraz)</label>
              <input
                type="number"
                min="0"
                max="30"
                value={actionConfig.dueDays || 1}
                onChange={(e) => setFormData({
                  ...formData,
                  actionConfig: { ...actionConfig, dueDays: parseInt(e.target.value) }
                })}
              />
            </div>
          </>
        );
      case 'ADD_TAG':
      case 'REMOVE_TAG':
        return (
          <div className="config-field">
            <label>Wybierz tag</label>
            <select
              value={actionConfig.tagId || ''}
              onChange={(e) => setFormData({
                ...formData,
                actionConfig: { ...actionConfig, tagId: parseInt(e.target.value) }
              })}
              required
            >
              <option value="">-- Wybierz tag --</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
        );
      case 'UPDATE_LEAD_SCORE':
        return (
          <div className="config-field">
            <label>Zmiana punktów (+/-)</label>
            <input
              type="number"
              min="-50"
              max="50"
              value={actionConfig.scoreChange || 0}
              onChange={(e) => setFormData({
                ...formData,
                actionConfig: { ...actionConfig, scoreChange: parseInt(e.target.value) }
              })}
              placeholder="np. +10 lub -5"
            />
          </div>
        );
      case 'SEND_NOTIFICATION':
        return (
          <div className="config-field">
            <label>Treść powiadomienia</label>
            <textarea
              value={actionConfig.message || ''}
              onChange={(e) => setFormData({
                ...formData,
                actionConfig: { ...actionConfig, message: e.target.value }
              })}
              placeholder="Treść powiadomienia..."
              rows={3}
            />
          </div>
        );
      case 'CREATE_DEAL':
        return (
          <>
            <div className="config-field">
              <label>Nazwa szansy</label>
              <input
                type="text"
                value={actionConfig.title || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  actionConfig: { ...actionConfig, title: e.target.value }
                })}
                placeholder="np. Nowa szansa od kontaktu"
              />
            </div>
            <div className="config-field">
              <label>Wartość (PLN)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={actionConfig.value || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  actionConfig: { ...actionConfig, value: parseFloat(e.target.value) }
                })}
                placeholder="np. 10000"
              />
            </div>
            <div className="config-field">
              <label>Lejek sprzedażowy</label>
              <select
                value={actionConfig.pipelineId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const newConfig = { ...actionConfig };
                  if (value) {
                    newConfig.pipelineId = parseInt(value);
                  } else {
                    delete newConfig.pipelineId; // Usuń gdy wybrano domyślny
                  }
                  setFormData({
                    ...formData,
                    actionConfig: newConfig
                  });
                }}
              >
                <option value="">-- Wybierz lejek (lub domyślny) --</option>
                {pipelines.map(pipeline => (
                  <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                ))}
              </select>
            </div>
          </>
        );
      case 'MOVE_DEAL':
        return (
          <div className="config-field">
            <label>Przenieś szansę do etapu</label>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '8px 0' }}>
              ⚠️ Uwaga: Wybierz etap - szansa zostanie przeniesiona gdy warunek się spełni
            </p>
            <select
              value={actionConfig.stageId || ''}
              onChange={(e) => setFormData({
                ...formData,
                actionConfig: { ...actionConfig, stageId: parseInt(e.target.value) }
              })}
              required
            >
              <option value="">-- Wybierz etap --</option>
              {pipelines.flatMap(pipeline =>
                (pipeline.stages || []).map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {pipeline.name} → {stage.name}
                  </option>
                ))
              )}
            </select>
          </div>
        );
      case 'SEND_EMAIL':
        return (
          <>
            <div className="config-field">
              <label>Wybierz szablon emaila *</label>
              <select
                value={actionConfig.templateId || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  actionConfig: { ...actionConfig, templateId: parseInt(e.target.value) }
                })}
                required
              >
                <option value="">-- Wybierz szablon --</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.category && `(${template.category})`}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Email zostanie wysłany do kontaktu powiązanego z triggerem
              </p>
            </div>
            <div className="config-field">
              <label>Konto do wysyłki (opcjonalne)</label>
              <select
                value={actionConfig.accountId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const newConfig = { ...actionConfig };
                  if (value) {
                    newConfig.accountId = parseInt(value);
                  } else {
                    delete newConfig.accountId;
                  }
                  setFormData({
                    ...formData,
                    actionConfig: newConfig
                  });
                }}
              >
                <option value="">-- Domyślne konto --</option>
                {emailAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.displayName || account.emailAddress}
                  </option>
                ))}
              </select>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const TriggerIcon = ({ type }) => {
    const config = TRIGGER_LABELS[type] || { icon: Zap, color: '#6b7280' };
    const Icon = config.icon;
    return <Icon size={18} style={{ color: config.color }} />;
  };

  const ActionIcon = ({ type }) => {
    const config = ACTION_LABELS[type] || { icon: Zap, color: '#6b7280' };
    const Icon = config.icon;
    return <Icon size={18} style={{ color: config.color }} />;
  };

  return (
    <div className="automations-container">
      {/* Header */}
      <div className="automations-header">
        <div className="automations-header-content">
          <div className="automations-header-icon">
            <Zap size={32} />
          </div>
          <div>
            <h1>Automatyzacje</h1>
            <p>Twórz reguły automatyzacji dla follow-up i workflow</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openNewModal}>
          <Plus size={18} /> Nowa automatyzacja
        </button>
      </div>

      {/* Stats */}
      <div className="automations-stats">
        <div className="stat-card">
          <div className="stat-icon-wrapper active">
            <Zap size={24} />
          </div>
          <div>
            <div className="stat-value">{rules.filter(r => r.active).length}</div>
            <div className="stat-label">Aktywne reguły</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper executions">
            <Activity size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.totalExecutions || 0}</div>
            <div className="stat-label">Wykonania łącznie</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper total">
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="stat-value">{rules.length}</div>
            <div className="stat-label">Wszystkie reguły</div>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="automations-list">
        {loading ? (
          <div className="loading-state">Ładowanie automatyzacji...</div>
        ) : rules.length === 0 ? (
          <div className="empty-state">
            <Zap size={48} />
            <h3>Brak automatyzacji</h3>
            <p>Utwórz pierwszą automatyzację, aby zautomatyzować swoje workflow.</p>
            <button className="btn btn-primary" onClick={openNewModal}>
              <Plus size={18} /> Utwórz automatyzację
            </button>
          </div>
        ) : (
          rules.map(rule => (
            <div 
              key={rule.id} 
              className={`automation-card ${rule.active ? 'active' : 'inactive'}`}
            >
              <div className="automation-main" onClick={() => setExpandedRuleId(
                expandedRuleId === rule.id ? null : rule.id
              )}>
                <div className="automation-status">
                  <span className={`status-dot ${rule.active ? 'active' : 'inactive'}`} />
                </div>
                
                <div className="automation-info">
                  <h3>{rule.name}</h3>
                  <div className="automation-flow">
                    <span className="flow-item trigger">
                      <TriggerIcon type={rule.triggerType} />
                      {TRIGGER_LABELS[rule.triggerType]?.label || rule.triggerType}
                    </span>
                    <span className="flow-arrow">→</span>
                    <span className="flow-item action">
                      <ActionIcon type={rule.actionType} />
                      {ACTION_LABELS[rule.actionType]?.label || rule.actionType}
                    </span>
                  </div>
                </div>

                <div className="automation-stats">
                  <span className="exec-count">{rule.executionCount || 0} wykonań</span>
                </div>

                <div className="automation-actions">
                  <button
                    className={`action-btn ${rule.active ? 'pause' : 'play'}`}
                    onClick={(e) => { e.stopPropagation(); handleToggle(rule.id); }}
                    title={rule.active ? 'Wyłącz' : 'Włącz'}
                  >
                    {rule.active ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    className="action-btn edit"
                    onClick={(e) => { e.stopPropagation(); handleEdit(rule); }}
                    title="Edytuj"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(rule.id); }}
                    title="Usuń"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button className="action-btn expand">
                    {expandedRuleId === rule.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {expandedRuleId === rule.id && (
                <div className="automation-details">
                  {rule.description && (
                    <div className="detail-row">
                      <span className="detail-label">Opis:</span>
                      <span>{rule.description}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Priorytet:</span>
                    <span>{rule.priority}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Wielokrotne wykonanie:</span>
                    <span>{rule.allowMultipleExecutions ? 'Tak' : 'Nie'}</span>
                  </div>
                  {rule.lastExecutedAt && (
                    <div className="detail-row">
                      <span className="detail-label">Ostatnie wykonanie:</span>
                      <span>{new Date(rule.lastExecutedAt).toLocaleString('pl-PL')}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Utworzono:</span>
                    <span>{new Date(rule.createdAt).toLocaleString('pl-PL')}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content automation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRule ? 'Edytuj automatyzację' : 'Nowa automatyzacja'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="automation-form">
              <div className="form-section">
                <h3>Podstawowe informacje</h3>
                
                <div className="form-group">
                  <label>Nazwa automatyzacji *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="np. Follow-up po otwarciu emaila"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Opis (opcjonalny)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Krótki opis działania automatyzacji..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Trigger (Kiedy uruchomić?)</h3>
                
                <div className="form-group">
                  <label>Typ triggera</label>
                  <select
                    value={formData.triggerType}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      triggerType: e.target.value,
                      triggerConfig: {}
                    })}
                  >
                    {Object.entries(TRIGGER_LABELS).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                {renderTriggerConfig()}
              </div>

              <div className="form-section">
                <h3>Akcja (Co zrobić?)</h3>
                
                <div className="form-group">
                  <label>Typ akcji</label>
                  <select
                    value={formData.actionType}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      actionType: e.target.value,
                      actionConfig: {}
                    })}
                  >
                    {Object.entries(ACTION_LABELS).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                {renderActionConfig()}
              </div>

              <div className="form-section">
                <h3>Opcje zaawansowane</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Priorytet (niższy = ważniejszy)</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.allowMultipleExecutions}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          allowMultipleExecutions: e.target.checked 
                        })}
                      />
                      Pozwól na wielokrotne wykonanie
                    </label>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      />
                      Aktywna od razu
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRule ? 'Zapisz zmiany' : 'Utwórz automatyzację'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Automations;

