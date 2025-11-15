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

export default api;
