/**
 * OAuth Callback Component
 *
 * Handles OAuth authentication callbacks from providers (Google, GitHub, etc.)
 * Extracts tokens from URL parameters and logs the user in
 *
 * @module components/OAuthCallback
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateToken, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Extract tokens from URL parameters
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const errorParam = searchParams.get('error');

        // Check for OAuth error
        if (errorParam) {
          setError(
            errorParam === 'oauth_failed'
              ? 'OAuth authentication failed. Please try again.'
              : 'An error occurred during authentication.'
          );
          // Redirect to login after 3 seconds
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Validate tokens
        if (!accessToken || !refreshToken) {
          setError('Invalid authentication response. Missing tokens.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Store tokens in localStorage
        localStorage.setItem('flowforge_access_token', accessToken);
        localStorage.setItem('flowforge_refresh_token', refreshToken);

        // Update auth context with new token
        updateToken(accessToken);

        // Refresh user profile data
        await refreshUser();

        // Redirect to home page
        navigate('/', { replace: true });
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Failed to complete authentication. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, updateToken, refreshUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-red-500 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <LoadingSpinner
      message="Completing authentication..."
      fullScreen
    />
  );
};

export default OAuthCallback;
