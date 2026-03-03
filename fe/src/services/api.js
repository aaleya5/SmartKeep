import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Document APIs
export const documentAPI = {
  getAll: () => apiClient.get('/documents/'),
};

// Content APIs
export const contentAPI = {
  createFromURL: (url) => apiClient.post('/content/url', { url }),
  createManual: (title, content) => apiClient.post('/content/manual', { title, content }),
  enrich: (id) => apiClient.post(`/content/${id}/enrich`),
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
  
  // Reorder collections
  reorder: (orderedIds) => 
    apiClient.put('/collections/reorder', { ordered_ids: orderedIds }),
};

// Search APIs
export const searchAPI = {
  search: (query, model = 'bm25', topK = 5) => 
    apiClient.get('/search', { params: { query, model, top_k: topK } }),
  searchSemantic: (query, topK = 10) => 
    apiClient.get('/search/semantic', { params: { query, top_k: topK } }),
  searchHybrid: (query, topK = 10, bm25Weight = 0.4) => 
    apiClient.get('/search/hybrid', { params: { query, top_k: topK, bm25_weight: bm25Weight } }),
  searchTFIDF: (query, topK = 5) => 
    apiClient.get('/search/tfidf', { params: { query, top_k: topK } }),
  benchmark: (query, topK = 5) => 
    apiClient.get('/search/benchmark', { params: { query, top_k: topK } }),
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

export default apiClient;
