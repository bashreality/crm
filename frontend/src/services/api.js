import axios from 'axios';

// Zawsze używaj względnej ścieżki - nginx przekaże to do backendu
const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - dodaj token do każdego zapytania
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - obsługa wygasłego tokena
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token wygasł lub jest nieprawidłowy
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Emails API
export const emailsApi = {
  getAll: (params) => api.get('/emails', { params }),
  getById: (id) => api.get(`/emails/${id}`),
  create: (data) => api.post('/emails', data),
  update: (id, data) => api.put(`/emails/${id}`, data),
  delete: (id) => api.delete(`/emails/${id}`),
  getCompanies: () => api.get('/emails/companies'),
  fetchEmails: () => api.post('/email-fetch/fetch'),
  suggestReply: (id) => api.post(`/emails/${id}/suggest-reply`),
  sendReply: (id, data) => api.post(`/emails/${id}/reply`, data),
};

// Contacts API
export const contactsApi = {
  getAll: (params) => api.get('/contacts', { params }),
  getCompanies: () => api.get('/contacts/companies'),
  getById: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  syncFromEmails: () => api.post('/contacts/sync-from-emails'),
  getContactEmails: (contactId) => api.get(`/contacts/${contactId}/emails`),
  
  // Lead Scoring
  updateScore: (id) => api.post(`/contacts/${id}/update-score`),
  getScoreBreakdown: (id) => api.get(`/contacts/${id}/score-breakdown`),
  
  // Import/Export
  importCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  exportCSV: () => api.get('/contacts/export', { responseType: 'blob' }),
  
  // Duplicates
  findDuplicates: () => api.get('/contacts/duplicates'),
  findDuplicatesForContact: (id) => api.get(`/contacts/${id}/duplicates`),
  mergeContacts: (primaryId, secondaryId) => 
    api.post(`/contacts/merge?primaryId=${primaryId}&secondaryId=${secondaryId}`),
  
  // Soft Delete / Restore
  restore: (id) => api.post(`/contacts/${id}/restore`),
  getDeleted: () => api.get('/contacts/deleted'),
  permanentDelete: (id) => api.delete(`/contacts/${id}/permanent`),
};

// Notes API
export const notesApi = {
  getByContact: (contactId) => api.get(`/notes/contact/${contactId}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
};

// AI API
export const aiApi = {
  generateSequence: (data) => api.post('/ai/generate-sequence', data),
  improveEmail: (data) => api.post('/ai/improve-email', data),
  generateSubject: (data) => api.post('/ai/generate-subject', data),
  personalizeContent: (data) => api.post('/ai/personalize', data),
  generateVariants: (data) => api.post('/ai/generate-variants', data),
};

// Campaigns API
export const campaignsApi = {
  getAll: (params) => api.get('/campaigns', { params }),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
};

// Woodpecker API
export const woodpeckerApi = {
  getMe: () => api.get('/woodpecker/me'),
  getCampaigns: () => api.get('/woodpecker/campaigns'),
  getCampaign: (id) => api.get(`/woodpecker/campaigns/${id}`),
  getCampaignProspects: (id) => api.get(`/woodpecker/campaigns/${id}/prospects`),
  importContacts: (campaignId, contactIds) => {
    const params = {};
    if (contactIds && contactIds.length > 0) {
      params.contactIds = contactIds.join(',');
    }
    return api.post(`/woodpecker/campaigns/${campaignId}/import-contacts`, null, { params });
  },
  createCampaign: (data) => api.post('/woodpecker/campaigns', data),
  getAllProspects: () => api.get('/woodpecker/prospects'),
  getMailboxes: () => api.get('/woodpecker/mailboxes'),
};

// Sequences API
export const sequencesApi = {
  getAll: () => api.get('/sequences'),
  getActive: () => api.get('/sequences/active'),
  getById: (id) => api.get(`/sequences/${id}`),
  getDashboard: () => api.get('/sequences/dashboard'),
  create: (data) => api.post('/sequences', data),
  update: (id, data) => api.put(`/sequences/${id}`, data),
  delete: (id) => api.delete(`/sequences/${id}`),

  // Steps
  getSteps: (sequenceId) => api.get(`/sequences/${sequenceId}/steps`),
  addStep: (sequenceId, data) => api.post(`/sequences/${sequenceId}/steps`, data),
  updateStep: (stepId, data) => api.put(`/sequences/steps/${stepId}`, data),
  deleteStep: (stepId) => api.delete(`/sequences/steps/${stepId}`),

  // Executions
  startSequence: (sequenceId, contactId, dealId = null) => {
    console.log('API: startSequence called with:', { sequenceId, contactId, dealId });
    return api.post(`/sequences/${sequenceId}/start`, { contactId, dealId });
  },
  testSequence: (sequenceId, testEmail) => api.post(`/sequences/${sequenceId}/test`, { testEmail }),
  pauseExecution: (executionId) => api.post(`/sequences/executions/${executionId}/pause`),
  resumeExecution: (executionId) => api.post(`/sequences/executions/${executionId}/resume`),
  getExecutions: (sequenceId) => api.get(`/sequences/${sequenceId}/executions`),
  getScheduledEmails: (executionId) => api.get(`/sequences/executions/${executionId}/scheduled-emails`),

  // Scheduled emails
  cancelScheduledEmail: (scheduledEmailId) => api.post(`/sequences/scheduled-emails/${scheduledEmailId}/cancel`),
  sendNow: (scheduledEmailId) => api.post(`/sequences/scheduled-emails/${scheduledEmailId}/send-now`),
};

// Tasks API
export const tasksApi = {
  getAll: (params) => api.get('/tasks', { params }),
  getPending: () => api.get('/tasks/pending'),
  getByContact: (contactId) => api.get(`/tasks/contact/${contactId}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  complete: (id) => api.put(`/tasks/${id}/complete`),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Email Accounts API
export const emailAccountsApi = {
  getAll: () => api.get('/email-accounts'),
  getEnabled: () => api.get('/email-accounts/enabled'),
  getById: (id) => api.get(`/email-accounts/${id}`),
  create: (data) => api.post('/email-accounts', data),
  update: (id, data) => api.put(`/email-accounts/${id}`, data),
  delete: (id) => api.delete(`/email-accounts/${id}`),
};

// Analytics API
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getAccountStats: (accountId) => api.get(`/analytics/account/${accountId}`),
  getEmailSentimentTrend: () => api.get('/analytics/email-sentiment-trend'),
  getGlobalSequenceAnalytics: () => api.get('/analytics/sequences/global'),
  getSequenceAnalytics: (sequenceId) => api.get(`/analytics/sequences/${sequenceId}`),
};

// Tags API
export const tagsApi = {
  getAll: () => api.get('/tags'),
  getById: (id) => api.get(`/tags/${id}`),
  create: (data) => api.post('/tags', data),
  update: (id, data) => api.put(`/tags/${id}`, data),
  delete: (id) => api.delete(`/tags/${id}`),
  addToContact: (contactId, tagId) => api.post(`/tags/contact/${contactId}/add/${tagId}`),
  removeFromContact: (contactId, tagId) => api.delete(`/tags/contact/${contactId}/remove/${tagId}`),
  addToContacts: (contactIds, tagId) => api.post('/tags/contacts/add', { contactIds, tagId }),
  removeFromContacts: (contactIds, tagId) => api.post('/tags/contacts/remove', { contactIds, tagId }),
  getContactsByTag: (tagId) => api.get(`/tags/${tagId}/contacts`),
};

export default api;
