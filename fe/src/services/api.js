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
};

// Search APIs
export const searchAPI = {
  search: (query, model = 'bm25', topK = 5) => 
    apiClient.get('/search', { params: { query, model, top_k: topK } }),
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
