import api from './api';

const emailTemplateService = {
  // Templates
  getAllTemplates: async (params = {}) => {
    const response = await api.get('/email-templates', { params });
    return response.data;
  },

  getTemplateById: async (id) => {
    const response = await api.get(`/email-templates/${id}`);
    return response.data;
  },

  createTemplate: async (template) => {
    const response = await api.post('/email-templates', template);
    return response.data;
  },

  updateTemplate: async (id, template) => {
    const response = await api.put(`/email-templates/${id}`, template);
    return response.data;
  },

  deleteTemplate: async (id) => {
    await api.delete(`/email-templates/${id}`);
  },

  toggleFavorite: async (id) => {
    const response = await api.post(`/email-templates/${id}/toggle-favorite`);
    return response.data;
  },

  previewTemplate: async (id, contactId = null, variables = {}) => {
    const response = await api.post(`/email-templates/${id}/preview`, {
      contactId,
      variables
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/email-templates/stats');
    return response.data;
  },

  // Themes
  getAllThemes: async () => {
    const response = await api.get('/email-templates/themes');
    return response.data;
  },

  getThemeById: async (id) => {
    const response = await api.get(`/email-templates/themes/${id}`);
    return response.data;
  },

  createTheme: async (theme) => {
    const response = await api.post('/email-templates/themes', theme);
    return response.data;
  },

  updateTheme: async (id, theme) => {
    const response = await api.put(`/email-templates/themes/${id}`, theme);
    return response.data;
  },

  deleteTheme: async (id) => {
    await api.delete(`/email-templates/themes/${id}`);
  },

  // Newsletter
  sendNewsletter: async (data) => {
    const response = await api.post('/email-templates/send-newsletter', data);
    return response.data;
  }
};

export default emailTemplateService;