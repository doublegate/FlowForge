/**
 * Register Component
 *
 * User registration form with comprehensive validation and error handling.
 * Integrates with AuthContext for authentication state management.
 *
 * @module components/Register
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

interface RegisterProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { register } = useAuth();

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Validate username
   */
  const validateUsername = (value: string): string | null => {
    if (!value.trim()) {
      return 'Username is required';
    }
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 30) {
      return 'Username cannot exceed 30 characters';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    return null;
  };

  /**
   * Validate email
   */
  const validateEmail = (value: string): string | null => {
    if (!value.trim()) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please provide a valid email address';
    }
    return null;
  };

  /**
   * Validate password
   */
  const validatePassword = (value: string): string | null => {
    if (!value) {
      return 'Password is required';
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  };

  /**
   * Validate confirm password
   */
  const validateConfirmPassword = (value: string): string | null => {
    if (!value) {
      return 'Please confirm your password';
    }
    if (value !== password) {
      return 'Passwords do not match';
    }
    return null;
  };

  /**
   * Handle field blur - validate individual field
   */
  const handleBlur = (field: string, value: string) => {
    let error: string | null = null;

    switch (field) {
      case 'username':
        error = validateUsername(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(value);
        break;
    }

    setValidationErrors((prev) => ({
      ...prev,
      [field]: error || ''
    }));
  };

  /**
   * Validate all fields
   */
  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};

    const usernameError = validateUsername(username);
    if (usernameError) errors.username = usernameError;

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(confirmPassword);
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate all fields
    if (!validateAll()) {
      setError('Please fix the errors above');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        displayName: displayName.trim() || username.trim()
      });

      // Success - call callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);

      // Extract error message
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Registration failed. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Google OAuth registration
   */
  const handleGoogleSignup = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Join FlowForge to start building workflows</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">
              Username <span className="required">*</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={(e) => handleBlur('username', e.target.value)}
              placeholder="Choose a username"
              disabled={isLoading}
              autoComplete="username"
              required
              className={validationErrors.username ? 'error' : ''}
            />
            {validationErrors.username && (
              <span className="field-error">{validationErrors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => handleBlur('email', e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              autoComplete="email"
              required
              className={validationErrors.email ? 'error' : ''}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name (optional)"
              disabled={isLoading}
              autoComplete="name"
            />
            <span className="field-hint">How you want to be addressed</span>
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={(e) => handleBlur('password', e.target.value)}
                placeholder="Create a password"
                disabled={isLoading}
                autoComplete="new-password"
                required
                className={validationErrors.password ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={isLoading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
            {!validationErrors.password && (
              <span className="field-hint">Minimum 8 characters</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password <span className="required">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={(e) => handleBlur('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
                disabled={isLoading}
                autoComplete="new-password"
                required
                className={validationErrors.confirmPassword ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                disabled={isLoading}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <span className="field-error">{validationErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <button
            type="button"
            className="oauth-btn google-btn"
            onClick={handleGoogleSignup}
            disabled={isLoading}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <button
              type="button"
              className="auth-switch-btn"
              onClick={onSwitchToLogin}
              disabled={isLoading}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
