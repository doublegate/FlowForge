/**
 * Loading Spinner Component
 *
 * Displays a loading spinner with optional message.
 * Used as fallback for lazy-loaded components.
 *
 * @module components/LoadingSpinner
 * @version 1.0.0
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'medium',
  fullScreen = false,
}) => {
  const sizeMap = {
    small: 24,
    medium: 48,
    large: 64,
  };

  const spinnerSize = sizeMap[size];

  const content = (
    <div className="loading-spinner-content">
      <Loader2 size={spinnerSize} className="spinner-icon" />
      {message && <p className="loading-message">{message}</p>}

      <style>{`
        .loading-spinner-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 24px;
        }

        .spinner-icon {
          color: var(--color-primary);
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .loading-message {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
          text-align: center;
        }

        .loading-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--color-bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return <div className="loading-fullscreen">{content}</div>;
  }

  return content;
};

export default LoadingSpinner;
