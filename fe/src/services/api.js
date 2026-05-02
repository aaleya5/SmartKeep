import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartkeep_auth_token');
    if (token) {
      config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.userMessage = 'Request timed out. Please check your connection.';
    } else if (!error.response) {
      error.userMessage = 'Cannot connect to server. Make sure the backend is running.';
    } else if (error.response.status === 401) {
      console.warn('Unauthorized - token may be invalid or expired');
      localStorage.removeItem('smartkeep_auth_token');
      localStorage.removeItem('smartkeep_user');
      delete apiClient.defaults.headers.common['Authorization'];
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (email, password) => apiClient.post('/auth/register', { email, password }),
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  me: () => apiClient.get('/auth/me'),
  socialLogin: (token, provider) => apiClient.post('/auth/social-login', { token, provider }),
  verifyEmail: (token) => apiClient.post('/auth/verify-email', { token }),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => apiClient.post('/auth/reset-password', { token, new_password: newPassword }),
};

// Content APIs
export const contentAPI = {
  createFromURL: (url) => apiClient.post('/content', { url }),
  createManual: (title, body) => apiClient.post('/content/manual', { title, body }),
  enrich: (id) => apiClient.post(`/content/${id}/enrich`),
  getById: (id) => apiClient.get(`/content/${id}`),
  update: (id, data) => apiClient.put(`/content/${id}`, data),
  delete: (id) => apiClient.delete(`/content/${id}`),
  updateProgress: (id, progress) => apiClient.patch(`/content/${id}/progress`, { reading_progress: progress }),
  acceptTags: (id, tags) => apiClient.post(`/content/${id}/accept-tags`, { tags }),
  getList: (params) => apiClient.get('/content', { params }),
  getTags: () => apiClient.get('/tags'),
  bulkDelete: (ids) => apiClient.delete('/content/bulk', { data: { content_ids: ids } }),
  bulkMarkRead: (ids, isRead = true) => apiClient.patch('/bulk/read', { content_ids: ids, is_read: isRead }),
  bulkExport: (ids) => apiClient.post('/bulk/export', { content_ids: ids }),
};

// Backwards compatibility for documentAPI
export const documentAPI = {
  getAll: (params) => contentAPI.getList(params),
};

// Collections APIs
export const collectionAPI = {
  create: (name, description, color, icon, isPinned) =>
    apiClient.post('/collections', { name, description, color, icon, is_pinned: isPinned }),
  getAll: (includeEmpty, sort) =>
    apiClient.get('/collections', { params: { include_empty: includeEmpty, sort } }),
  get: (id) => apiClient.get(`/collections/${id}`),
  update: (id, data) => apiClient.put(`/collections/${id}`, data),
  delete: (id) => apiClient.delete(`/collections/${id}`),
  addDocuments: (collectionId, contentIds) =>
    apiClient.post(`/collections/${collectionId}/content`, { content_ids: contentIds }),
  removeDocument: (collectionId, documentId) =>
    apiClient.delete(`/collections/${collectionId}/content/${documentId}`),
  getForDocument: (documentId) => apiClient.get(`/collections/document/${documentId}`),
  getContent: (collectionId, params) =>
    apiClient.get(`/collections/${collectionId}/content`, { params }),
  reorder: (orderedIds) => apiClient.put('/collections/reorder', { ordered_ids: orderedIds }),
  getUncollectedContent: (params) => apiClient.get('/collections/uncollected/content', { params }),
  getUncollectedCount: () => apiClient.get('/collections/uncollected/count'),
};

// Search APIs
export const searchAPI = {
  search: (query, mode = 'hybrid', options = {}) =>
    apiClient.get('/search', { params: { query, mode, ...options } }),
  getHistory: (limit = 10) =>
    apiClient.get('/search/history', { params: { limit } }),
  deleteHistory: () =>
    apiClient.delete('/search/history'),
  getSaved: () =>
    apiClient.get('/search/saved'),
  saveSearch: (name, query, mode) =>
    apiClient.post('/search/saved', { name, query, mode }),
  deleteSaved: (searchId) =>
    apiClient.delete(`/search/saved/${searchId}`),
};

// Annotations APIs
export const annotationAPI = {
  create: (contentId, annotationData) =>
    apiClient.post(`/content/${contentId}/annotations`, annotationData),
  getForContent: (contentId) =>
    apiClient.get(`/content/${contentId}/annotations`),
  update: (annotationId, data) =>
    apiClient.put(`/annotations/${annotationId}`, data),
  delete: (annotationId) =>
    apiClient.delete(`/annotations/${annotationId}`),
  list: (params) =>
    apiClient.get('/annotations', { params }),
  export: (format = 'markdown') =>
    apiClient.get('/annotations/export', { params: { format } }),
};

// Explore/Analytics APIs
export const exploreAPI = {
  getClusters: () => apiClient.get('/explore/clusters'),
  getSimilarPairs: (limit, threshold) =>
    apiClient.get('/explore/similar-pairs', { params: { limit, threshold } }),
  getForgotten: (olderThanDays, minAge) =>
    apiClient.get('/explore/forgotten', { params: { older_than_days: olderThanDays, min_age: minAge } }),
};

// Stats APIs
export const statsAPI = {
  getOverview: () => apiClient.get('/stats/overview'),
  getSavesOverTime: (days, granularity) => 
    apiClient.get('/stats/saves-over-time', { params: { days, granularity } }),
  getTopDomains: (limit) => 
    apiClient.get('/stats/top-domains', { params: { limit } }),
  getTagDistribution: (limit) =>
    apiClient.get('/stats/tag-distribution', { params: { limit } }),
  getReadingTimeDistribution: () => 
    apiClient.get('/stats/reading-time-distribution'),
  getDifficultyOverTime: () => 
    apiClient.get('/stats/difficulty-over-time'),
  getActivityHeatmap: (days) =>
    apiClient.get('/stats/activity-heatmap', { params: { days } }),
  getWeekdayActivity: () => 
    apiClient.get('/stats/weekday-activity'),
  getStreak: () =>
    apiClient.get('/stats/streak'),
};

// Import/Export APIs
export const importExportAPI = {
  exportJSON: () =>
    apiClient.get('/export/json'),
  exportMarkdown: () =>
    apiClient.get('/export/markdown'),
  importPocket: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/import/pocket', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importRaindrop: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/import/raindrop', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importBookmarks: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/import/bookmarks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getImportStatus: (jobId) =>
    apiClient.get(`/import/status/${jobId}`),
};

// Preferences APIs
export const preferencesAPI = {
  get: () =>
    apiClient.get('/preferences'),
  update: (data) =>
    apiClient.put('/preferences', data),
  testLLM: (config) =>
    apiClient.post('/preferences/test-llm', config),
};

export default apiClient;
