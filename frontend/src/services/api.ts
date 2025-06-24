import axios from 'axios';
import type { 
  WorkflowSuggestionsResponse, 
  SavedWorkflow 
} from '../types';

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
  getActions: (params?: { limit?: number; offset?: number; category?: string; search?: string }) => 
    api.get('/api/actions', { params }),
  getActionById: (id: string) => api.get(`/api/actions/${id}`),
  searchActions: (query: string) => 
    api.post('/api/actions/search', { query }),
  updateActions: () => api.post('/api/actions/update'),

  // Categories
  getCategories: () => api.get('/api/categories'),

  // Templates
  getTemplates: (params?: { category?: string; search?: string }) => 
    api.get('/api/templates', { params }),
  getTemplateById: (id: string) => api.get(`/api/templates/${id}`),

  // AI Assistant
  generateWorkflow: (prompt: string) => 
    api.post('/api/ai/generate-workflow', { prompt }),
  getSuggestions: (workflow: Record<string, unknown>, context?: string) => 
    api.post<WorkflowSuggestionsResponse>('/api/ai/suggest', { workflow, context }),

  // Workflow validation
  validateWorkflow: (yaml: string) => 
    api.post('/api/workflows/validate', { yaml }),
  optimizeWorkflow: (workflow: Record<string, unknown>) => 
    api.post('/api/workflows/optimize', { workflow }),

  // Workflow persistence (to be implemented)
  saveWorkflow: (workflow: Partial<SavedWorkflow>) => 
    api.post<SavedWorkflow>('/api/workflows', workflow),
  getWorkflows: () => 
    api.get('/api/workflows'),
  getWorkflow: (id: string) => 
    api.get(`/api/workflows/${id}`),
  updateWorkflow: (id: string, workflow: Partial<SavedWorkflow>) => 
    api.put<SavedWorkflow>(`/api/workflows/${id}`, workflow),
  deleteWorkflow: (id: string) => 
    api.delete(`/api/workflows/${id}`),
};

export default api;