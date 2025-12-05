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
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { tagsApi, emailAccountsApi } from '../services/api';
import '../styles/Campaigns.css';

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

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);
  const [testEmail, setTestEmail] = useState('');

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, tagsRes, accountsRes] = await Promise.all([
        newsletterApi.getCampaigns().catch(() => ({ data: [] })),
        tagsApi.getAll(),
        emailAccountsApi.getAll(),
      ]);
      setCampaigns(campaignsRes.data || []);
      setTags(tagsRes.data || []);
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
      toast.error('Nazwa kampanii jest wymagana');
      return;
    }

    try {
      const payload = {
        ...formData,
        targetTag: formData.targetTag ? { id: parseInt(formData.targetTag) } : null,
        emailAccount: formData.emailAccount ? { id: parseInt(formData.emailAccount) } : null,
        scheduledAt: formData.scheduledAt || null,
      };

      if (editingCampaign) {
        await newsletterApi.updateCampaign(editingCampaign.id, payload);
        toast.success('Kampania zaktualizowana');
      } else {
        await newsletterApi.createCampaign(payload);
        toast.success('Kampania utworzona');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Błąd zapisywania kampanii');
    }
  };

  const handlePrepare = async (campaign) => {
    try {
      await newsletterApi.prepareCampaign(campaign.id);
      toast.success('Kampania przygotowana do wysyłki');
      fetchData();
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
      fetchData();
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast.error('Błąd uruchamiania kampanii');
    }
  };

  const handlePause = async (campaign) => {
    try {
      await newsletterApi.pauseCampaign(campaign.id);
      toast.success('Wysyłka wstrzymana');
      fetchData();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Błąd pauzowania kampanii');
    }
  };

  const handleResume = async (campaign) => {
    try {
      await newsletterApi.resumeCampaign(campaign.id);
      toast.success('Wysyłka wznowiona');
      fetchData();
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

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
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
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingCampaign(null);
    setFormData({
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

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
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

  return (
    <div className="campaigns-container">
      {/* Header */}
      <div className="campaigns-header">
        <div>
          <h1>Kampanie i Newsletter</h1>
          <p>Zarządzaj kampaniami emailowymi i wysyłką newslettera</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchData}>
            <RefreshCw size={18} /> Odśwież
          </button>
          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={18} /> Nowa kampania
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="campaigns-stats-grid">
        <div className="stat-card">
          <Mail size={24} />
          <div>
            <div className="stat-value">{campaigns.length}</div>
            <div className="stat-label">Wszystkie kampanie</div>
          </div>
        </div>
        <div className="stat-card">
          <Send size={24} />
          <div>
            <div className="stat-value">{campaigns.filter(c => c.status === 'sending').length}</div>
            <div className="stat-label">Aktywne wysyłki</div>
          </div>
        </div>
        <div className="stat-card">
          <CheckCircle size={24} />
          <div>
            <div className="stat-value">{campaigns.filter(c => c.status === 'completed').length}</div>
            <div className="stat-label">Zakończone</div>
          </div>
        </div>
        <div className="stat-card">
          <Users size={24} />
          <div>
            <div className="stat-value">
              {campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0)}
            </div>
            <div className="stat-label">Wysłanych emaili</div>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="campaigns-list-container">
        <div className="campaigns-list-header">
          <h2>Lista kampanii</h2>
        </div>

        {loading ? (
          <div className="loading-state">Ładowanie kampanii...</div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <Mail size={48} />
            <h3>Brak kampanii</h3>
            <p>Utwórz pierwszą kampanię, aby rozpocząć wysyłkę newslettera.</p>
            <button className="btn btn-primary" onClick={openNewModal}>
              <Plus size={18} /> Utwórz kampanię
            </button>
          </div>
        ) : (
          <div className="campaigns-grid">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="campaign-card">
                <div className="campaign-card-header">
                  <h3>{campaign.name}</h3>
                  {getStatusBadge(campaign.status)}
                </div>

                {campaign.description && (
                  <p className="campaign-description">{campaign.description}</p>
                )}

                <div className="campaign-metrics">
                  <div className="metric">
                    <Users size={16} />
                    <span>{campaign.totalContacts || 0} kontaktów</span>
                  </div>
                  <div className="metric">
                    <Send size={16} />
                    <span>{campaign.sentCount || 0} wysłanych</span>
                  </div>
                  <div className="metric">
                    <Eye size={16} />
                    <span>{campaign.openedCount || 0} otwartych</span>
                  </div>
                  <div className="metric">
                    <MousePointer size={16} />
                    <span>{campaign.clickedCount || 0} kliknięć</span>
                  </div>
                </div>

                {campaign.targetTag && (
                  <div className="campaign-tag">
                    Tag: <span style={{ backgroundColor: campaign.targetTag.color, color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>
                      {campaign.targetTag.name}
                    </span>
                  </div>
                )}

                <div className="campaign-card-actions">
                  {campaign.status === 'draft' && (
                    <>
                      <button className="action-btn edit" onClick={() => handleEdit(campaign)} title="Edytuj">
                        <Edit3 size={16} />
                      </button>
                      <button className="action-btn prepare" onClick={() => handlePrepare(campaign)} title="Przygotuj">
                        <CheckCircle size={16} />
                      </button>
                    </>
                  )}
                  {campaign.status === 'scheduled' && (
                    <button className="action-btn start" onClick={() => handleStart(campaign)} title="Rozpocznij">
                      <Play size={16} />
                    </button>
                  )}
                  {campaign.status === 'sending' && (
                    <button className="action-btn pause" onClick={() => handlePause(campaign)} title="Wstrzymaj">
                      <Pause size={16} />
                    </button>
                  )}
                  {campaign.status === 'paused' && (
                    <button className="action-btn resume" onClick={() => handleResume(campaign)} title="Wznów">
                      <Play size={16} />
                    </button>
                  )}
                  <button className="action-btn stats" onClick={() => handleViewStats(campaign)} title="Statystyki">
                    <BarChart2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content campaign-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCampaign ? 'Edytuj kampanię' : 'Nowa kampania'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="campaign-form">
              <div className="form-section">
                <div className="form-group">
                  <label>Nazwa kampanii *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="np. Newsletter grudniowy"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Opis</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Krótki opis kampanii..."
                    rows={2}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Typ kampanii</label>
                    <select
                      value={formData.campaignType}
                      onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}
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
                      value={formData.emailAccount || ''}
                      onChange={(e) => setFormData({ ...formData, emailAccount: e.target.value || null })}
                    >
                      <option value="">-- Wybierz konto --</option>
                      {emailAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Treść</h3>
                
                <div className="form-group">
                  <label>Temat emaila *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Temat wiadomości..."
                  />
                </div>

                <div className="form-group">
                  <label>Treść emaila (HTML)</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="<p>Treść HTML...</p>"
                    rows={6}
                  />
                  <small>Możesz użyć zmiennych: {'{{name}}'}, {'{{firstName}}'}, {'{{company}}'}</small>
                </div>
              </div>

              <div className="form-section">
                <h3>Odbiorcy i planowanie</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tag docelowy</label>
                    <select
                      value={formData.targetTag || ''}
                      onChange={(e) => setFormData({ ...formData, targetTag: e.target.value || null })}
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
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Limit na godzinę</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.throttlePerHour}
                      onChange={(e) => setFormData({ ...formData, throttlePerHour: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Limit dzienny</label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={formData.dailyLimit}
                      onChange={(e) => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCampaign ? 'Zapisz zmiany' : 'Utwórz kampanię'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {selectedCampaign && campaignStats && (
        <div className="modal-overlay" onClick={() => { setSelectedCampaign(null); setCampaignStats(null); }}>
          <div className="modal-content stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Statystyki: {selectedCampaign.name}</h2>
              <button className="modal-close" onClick={() => { setSelectedCampaign(null); setCampaignStats(null); }}>×</button>
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{campaignStats.totalContacts || 0}</div>
                <div className="stat-label">Odbiorców</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{campaignStats.sentCount || 0}</div>
                <div className="stat-label">Wysłanych</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{campaignStats.pendingCount || 0}</div>
                <div className="stat-label">Oczekujących</div>
              </div>
              <div className="stat-item highlight">
                <div className="stat-value">{(campaignStats.openRate || 0).toFixed(1)}%</div>
                <div className="stat-label">Open Rate</div>
              </div>
              <div className="stat-item highlight">
                <div className="stat-value">{(campaignStats.clickRate || 0).toFixed(1)}%</div>
                <div className="stat-label">Click Rate</div>
              </div>
              <div className="stat-item danger">
                <div className="stat-value">{(campaignStats.bounceRate || 0).toFixed(1)}%</div>
                <div className="stat-label">Bounce Rate</div>
              </div>
              <div className="stat-item danger">
                <div className="stat-value">{(campaignStats.unsubscribeRate || 0).toFixed(1)}%</div>
                <div className="stat-label">Unsubscribe Rate</div>
              </div>
            </div>

            {selectedCampaign.status === 'draft' && (
              <div className="test-email-section">
                <h3>Wyślij testowy email</h3>
                <div className="test-email-form">
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
    </div>
  );
};

export default Campaigns;
