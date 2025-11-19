/**
 * Authentication Context Provider
 *
 * Provides authentication state and methods throughout the application.
 * Handles user login, registration, logout, token management, and auto-login.
 *
 * @module contexts/AuthContext
 * @version 1.0.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Types
interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  isEmailVerified?: boolean;
  lastLogin?: string;
  loginCount?: number;
  preferences?: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    defaultWorkflowVisibility: 'private' | 'public';
  };
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface LoginCredentials {
  identifier: string; // username or email
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateToken: (token: string) => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

// Token storage keys
const TOKEN_KEY = 'flowforge_access_token';
const REFRESH_TOKEN_KEY = 'flowforge_refresh_token';

/**
 * AuthProvider component
 * Wraps the application to provide authentication state
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configure axios interceptors
  useEffect(() => {
    // Request interceptor - add auth token to all requests
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh on 401
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and haven't retried yet, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken
            });

            const { accessToken } = response.data;
            localStorage.setItem(TOKEN_KEY, accessToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            handleLogout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // Cleanup interceptors on unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Auto-login on page load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (token) {
        try {
          // Fetch current user profile
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          setUser(response.data.user);
        } catch (error) {
          console.error('Auto-login failed:', error);
          // Clear invalid tokens
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Login user with credentials
   */
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);

      const { user: userData, accessToken, refreshToken } = response.data;

      // Store tokens
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

      // Set user state
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * Register new user
   */
  const register = async (data: RegisterData): Promise<void> => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, data);

      const { user: userData, accessToken, refreshToken } = response.data;

      // Store tokens
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

      // Set user state
      setUser(userData);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  /**
   * Logout current user
   */
  const logout = (): void => {
    handleLogout();
  };

  /**
   * Internal logout handler
   */
  const handleLogout = (): void => {
    // Clear tokens
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);

    // Clear user state
    setUser(null);

    // Optionally call logout endpoint
    axios.post(`${API_URL}/auth/logout`).catch(() => {
      // Ignore errors on logout endpoint
    });
  };

  /**
   * Refresh user profile data
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  /**
   * Update access token (used after refresh)
   */
  const updateToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

// Export types
export type { User, LoginCredentials, RegisterData, AuthTokens };
