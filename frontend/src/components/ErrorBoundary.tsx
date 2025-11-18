/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree,
 * logs those errors, and displays a fallback UI.
 *
 * @module components/ErrorBoundary
 * @version 1.0.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // You could also log to an error reporting service here
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-icon">
              <AlertTriangle size={64} />
            </div>

            <h1>Something went wrong</h1>
            <p className="error-message">
              We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
            </p>

            {this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <div className="error-stack">
                  <p className="error-name">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="error-component-stack">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="error-actions">
              <button onClick={this.handleReset} className="btn-primary">
                <RefreshCw size={18} />
                Try Again
              </button>
              <button onClick={this.handleReload} className="btn-secondary">
                <RefreshCw size={18} />
                Reload Page
              </button>
              <button onClick={this.handleGoHome} className="btn-secondary">
                <Home size={18} />
                Go Home
              </button>
            </div>
          </div>

          <style>{`
            .error-boundary-container {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }

            .error-boundary-content {
              background-color: white;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              padding: 48px;
              max-width: 600px;
              width: 100%;
              text-align: center;
            }

            .error-icon {
              color: #f59e0b;
              margin-bottom: 24px;
            }

            .error-boundary-content h1 {
              font-size: 28px;
              font-weight: 700;
              color: #1a202c;
              margin-bottom: 16px;
            }

            .error-message {
              font-size: 16px;
              color: #4a5568;
              margin-bottom: 32px;
              line-height: 1.6;
            }

            .error-details {
              background-color: #f7fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 32px;
              text-align: left;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 600;
              color: #2d3748;
              user-select: none;
            }

            .error-details summary:hover {
              color: #1a202c;
            }

            .error-stack {
              margin-top: 16px;
            }

            .error-name {
              color: #e53e3e;
              font-weight: 600;
              margin-bottom: 12px;
            }

            .error-component-stack {
              background-color: #1a202c;
              color: #f7fafc;
              padding: 12px;
              border-radius: 4px;
              overflow-x: auto;
              font-size: 12px;
              line-height: 1.5;
              font-family: 'Monaco', 'Consolas', monospace;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              flex-wrap: wrap;
            }

            .error-actions button {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            }

            .btn-primary {
              background-color: #667eea;
              color: white;
            }

            .btn-primary:hover {
              background-color: #5a67d8;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .btn-secondary {
              background-color: #e2e8f0;
              color: #2d3748;
            }

            .btn-secondary:hover {
              background-color: #cbd5e0;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            @media (max-width: 640px) {
              .error-boundary-content {
                padding: 32px 24px;
              }

              .error-boundary-content h1 {
                font-size: 24px;
              }

              .error-actions {
                flex-direction: column;
              }

              .error-actions button {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
