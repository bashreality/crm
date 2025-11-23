import axios from 'axios';

// Użyj względnej ścieżki dla produkcji (nginx proxy) lub zmiennej środowiskowej
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  getById: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  syncFromEmails: () => api.post('/contacts/sync-from-emails'),
  getContactEmails: (contactId) => api.get(`/contacts/${contactId}/emails`),
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
  startSequence: (sequenceId, contactId) => api.post(`/sequences/${sequenceId}/start`, { contactId }),
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
};

export default api;
