import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Document APIs - using /content endpoint
export const documentAPI = {
  getAll: (params) => apiClient.get('/content', { params }),
};

// Content APIs
export const contentAPI = {
  createFromURL: (url) => apiClient.post('/content', { url }),
  createManual: (title, content) => apiClient.post('/content/manual', { title, content }),
  enrich: (id) => apiClient.post(`/content/${id}/enrich`),
  getById: (id) => apiClient.get(`/content/${id}`),
  update: (id, data) => apiClient.put(`/content/${id}`, data),
  delete: (id) => apiClient.delete(`/content/${id}`),
  updateProgress: (id, progress) => apiClient.patch(`/content/${id}/progress`, { reading_progress: progress }),
  acceptTags: (id, tags) => apiClient.post(`/content/${id}/accept-tags`, { tags }),
  getList: (params) => apiClient.get('/content', { params }),
};

// Collections APIs
export const collectionAPI = {
  // Create a new collection
  create: (name, description, color, icon = "📁", isPinned = false) => 
    apiClient.post('/collections', { 
      name, 
      description, 
      color, 
      icon,
      is_pinned: isPinned 
    }),
  
  // Get all collections
  getAll: (includeEmpty = true, sort = 'newest') => 
    apiClient.get('/collections', { 
      params: { 
        include_empty: includeEmpty, 
        sort 
      } 
    }),
  
  // Get a single collection with documents
  get: (id) => apiClient.get(`/collections/${id}`),
  
  // Update a collection
  update: (id, data) => apiClient.put(`/collections/${id}`, data),
  
  // Delete a collection
  delete: (id) => apiClient.delete(`/collections/${id}`),
  
  // Add documents to a collection (bulk)
  addDocuments: (collectionId, contentIds) => 
    apiClient.post(`/collections/${collectionId}/content`, { content_ids: contentIds }),
  
  // Remove a document from a collection
  removeDocument: (collectionId, documentId) => 
    apiClient.delete(`/collections/${collectionId}/content/${documentId}`),
  
  // Get collections for a specific document
  getForDocument: (documentId) => 
    apiClient.get(`/collections/document/${documentId}`),
  
  // Get content in a collection
  getContent: (collectionId, page = 1, pageSize = 20, sort = 'newest') =>
    apiClient.get(`/collections/${collectionId}/content`, {
      params: { page, page_size: pageSize, sort }
    }),
  
  // Get recent items in a collection (for hover preview)
  getRecentItems: (collectionId, limit = 3) =>
    apiClient.get(`/collections/${collectionId}/content`, {
      params: { page: 1, page_size: limit, sort: 'newest' }
    }),
  
  // Reorder collections
  reorder: (orderedIds) => 
    apiClient.put('/collections/reorder', { ordered_ids: orderedIds }),
};

// Search APIs
export const searchAPI = {
  // Main unified search endpoint
  search: (query, mode = 'hybrid', options = {}) => {
    const params = {
      query,
      mode,
      limit: options.limit || 20,
      offset: options.offset || 0,
    };
    if (options.tags) params.tags = options.tags.join(',');
    if (options.domain) params.domain = options.domain;
    if (options.date_from) params.date_from = options.date_from;
    if (options.date_to) params.date_to = options.date_to;
    if (options.difficulty) params.difficulty = options.difficulty;
    if (options.collection_id) params.collection_id = options.collection_id;
    
    return apiClient.get('/search', { params });
  },
  
  // Get autocomplete suggestions
  getSuggestions: (query, limit = 5) => 
    apiClient.get('/search/suggestions', { params: { q: query, limit } }),
  
  // Get search history
  getHistory: (limit = 10) => 
    apiClient.get('/search/history', { params: { limit } }),
  
  // Clear search history
  clearHistory: () => apiClient.delete('/search/history'),
  
  // Get saved searches
  getSavedSearches: () => apiClient.get('/search/saved'),
  
  // Save a search
  saveSearch: (name, query, mode, filters = {}) => 
    apiClient.post('/search/saved', { name, query, mode, filters }),
  
  // Delete a saved search
  deleteSavedSearch: (searchId) => apiClient.delete(`/search/saved/${searchId}`),
};

// Explore/Discovery APIs
export const exploreAPI = {
  // Get content graph for visualization
  getGraph: (limit = 50, minSimilarity = 0.6) =>
    apiClient.get('/explore/graph', { params: { limit, min_similarity: minSimilarity } }),
  
  // Get similar pairs
  getSimilarPairs: (limit = 10, minSimilarity = 0.75) =>
    apiClient.get('/explore/similar-pairs', { params: { limit, min_similarity: minSimilarity } }),
  
  // Get content clusters
  getClusters: () =>
    apiClient.get('/explore/clusters'),
  
  // Get forgotten items
  getForgotten: (daysAgo = 60, limit = 10) =>
    apiClient.get('/explore/forgotten', { params: { days_ago: daysAgo, limit } }),
  
  // Get similar items for specific content
  getSimilarItems: (contentId, limit = 5) =>
    apiClient.get(`/explore/similar/${contentId}`, { params: { limit } }),
};

// Stats APIs
export const statsAPI = {
  // Get overview stats
  getOverview: () =>
    apiClient.get('/stats/overview'),
  
  // Get saves over time (line chart with rolling average)
  getSavesOverTime: (days = 90, granularity = 'day') =>
    apiClient.get('/stats/saves-over-time', { params: { days, granularity } }),
  
  // Get top domains (horizontal bar chart)
  getTopDomains: (limit = 10) =>
    apiClient.get('/stats/top-domains', { params: { limit } }),
  
  // Get tag distribution (pie/donut chart)
  getTagDistribution: (limit = 15) =>
    apiClient.get('/stats/tag-distribution', { params: { limit } }),
  
  // Get reading time distribution (histogram)
  getReadingTimeDistribution: () =>
    apiClient.get('/stats/reading-time-distribution'),
  
  // Get difficulty over time (stacked bar per month)
  getDifficultyOverTime: () =>
    apiClient.get('/stats/difficulty-over-time'),
  
  // Get activity heatmap
  getActivityHeatmap: (days = 365) =>
    apiClient.get('/stats/activity-heatmap', { params: { days } }),
  
  // Get weekday activity (radar chart)
  getWeekdayActivity: () =>
    apiClient.get('/stats/weekday-activity'),
  
  // Get streak info
  getStreak: () =>
    apiClient.get('/stats/streak'),
};

// Evaluation APIs
export const evaluationAPI = {
  evaluate: (queries, model = 'bm25', k = 5) => 
    apiClient.post('/evaluate', { queries }, { params: { model, k } }),
  evaluatePrecision: (query, relevantIds, model = 'bm25', k = 5) => 
    apiClient.get('/evaluate/precision', { 
      params: { query, relevant_ids: relevantIds.join(','), model, k } 
    }),
};

// Annotation APIs
export const annotationAPI = {
  getForContent: (contentId) => apiClient.get(`/content/${contentId}/annotations`),
  create: (contentId, data) => apiClient.post(`/content/${contentId}/annotations`, data),
  update: (annotationId, data) => apiClient.put(`/annotations/${annotationId}`, data),
  delete: (annotationId) => apiClient.delete(`/annotations/${annotationId}`),
  list: (params) => apiClient.get('/annotations', { params }),
  export: (format = 'markdown') => apiClient.get('/annotations/export', { 
    params: { format },
    responseType: 'blob'
  }),
};

export default apiClient;

// Preferences APIs
export const preferencesAPI = {
  // Get current preferences
  get: () => apiClient.get('/preferences'),
  
  // Update preferences
  update: (data) => apiClient.put('/preferences', data),
  
  // Test LLM connection
  testLLM: (provider, apiKey, baseUrl) => 
    apiClient.post('/preferences/test-llm', { 
      provider, 
      api_key: apiKey, 
      base_url: baseUrl 
    }),
};

// Import/Export APIs
export const importExportAPI = {
  // Export as JSON
  exportJSON: () => apiClient.get('/export/json', { responseType: 'blob' }),
  
  // Export as Markdown (ZIP)
  exportMarkdown: (collectionId) => 
    apiClient.get('/export/markdown', { 
      params: { collection_id: collectionId },
      responseType: 'blob' 
    }),
  
  // Import from Pocket
  importPocket: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/import/pocket', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Import from Raindrop
  importRaindrop: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/import/raindrop', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Import from Browser Bookmarks
  importBookmarks: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/import/bookmarks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Get import status
  getImportStatus: (jobId) => apiClient.get(`/import/status/${jobId}`),
};
