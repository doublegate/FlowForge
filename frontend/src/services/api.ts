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

// Token storage keys (matches AuthContext)
const TOKEN_KEY = 'flowforge_access_token';
const REFRESH_TOKEN_KEY = 'flowforge_refresh_token';

// Request interceptor for auth or logging
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken
          });

          const { accessToken } = response.data;
          localStorage.setItem(TOKEN_KEY, accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Health check
  health: () => api.get('/api/health'),

  // Authentication
  auth: {
    register: (data: { username: string; email: string; password: string; displayName?: string }) =>
      api.post('/api/auth/register', data),
    login: (credentials: { identifier: string; password: string }) =>
      api.post('/api/auth/login', credentials),
    logout: () => api.post('/api/auth/logout'),
    refreshToken: (refreshToken: string) =>
      api.post('/api/auth/refresh', { refreshToken }),
    getCurrentUser: () => api.get('/api/auth/me'),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      api.put('/api/auth/password', data),
  },

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