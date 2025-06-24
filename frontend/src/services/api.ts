import axios from 'axios';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for auth or logging
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      // Redirect to login if needed
    }
    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Health check
  health: () => api.get('/api/health'),

  // Actions
  getActions: () => api.get('/api/actions'),
  searchActions: (query: string) => api.get('/api/actions/search', { params: { q: query } }),
  getActionByRepo: (owner: string, repo: string) => 
    api.get(`/api/actions/${owner}/${repo}`),
  discoverActions: (url: string) => 
    api.post('/api/actions/discover', { url }),

  // Templates
  getTemplates: () => api.get('/api/templates'),
  getTemplatesByCategory: (category: string) => 
    api.get('/api/templates/category', { params: { category } }),
  getTemplateById: (id: string) => api.get(`/api/templates/${id}`),

  // AI Assistant
  generateWorkflow: (prompt: string) => 
    api.post('/api/ai/generate-workflow', { prompt }),
  explainWorkflow: (workflow: any) => 
    api.post('/api/ai/explain', { workflow }),
  getSuggestions: (workflow: any, context?: string) => 
    api.post('/api/ai/suggest', { workflow, context }),

  // Workflow validation
  validateYaml: (yaml: string) => 
    api.post('/api/validate/yaml', { yaml }),

  // Workflow persistence (to be implemented)
  saveWorkflow: (workflow: any) => 
    api.post('/api/workflows', workflow),
  getWorkflows: () => 
    api.get('/api/workflows'),
  getWorkflow: (id: string) => 
    api.get(`/api/workflows/${id}`),
  updateWorkflow: (id: string, workflow: any) => 
    api.put(`/api/workflows/${id}`, workflow),
  deleteWorkflow: (id: string) => 
    api.delete(`/api/workflows/${id}`),
};

export default api;