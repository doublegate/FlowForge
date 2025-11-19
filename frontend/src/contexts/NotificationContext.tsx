/**
 * Notification Context
 *
 * Provides a global notification/toast system for displaying
 * success, error, warning, and info messages throughout the app.
 *
 * @module contexts/NotificationContext
 * @version 1.0.0
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (
    type: NotificationType,
    title: string,
    message?: string,
    duration?: number
  ) => void;
  removeNotification: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, title: string, message?: string, duration: number = 5000) => {
      const id = `${Date.now()}-${Math.random()}`;
      const notification: Notification = { id, type, title, message, duration };

      setNotifications((prev) => [...prev, notification]);

      // Auto-dismiss after duration
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) => {
      showNotification('success', title, message, duration);
    },
    [showNotification]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => {
      showNotification('error', title, message, duration);
    },
    [showNotification]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => {
      showNotification('warning', title, message, duration);
    },
    [showNotification]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => {
      showNotification('info', title, message, duration);
    },
    [showNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        removeNotification,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Notification Container Component
interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => onRemove(notification.id)}
        />
      ))}

      <style>{`
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 400px;
        }

        @media (max-width: 640px) {
          .notification-container {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
};

// Individual Notification Item
interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
    }
  };

  const getColorClass = () => {
    switch (notification.type) {
      case 'success':
        return 'notification-success';
      case 'error':
        return 'notification-error';
      case 'warning':
        return 'notification-warning';
      case 'info':
        return 'notification-info';
    }
  };

  return (
    <div className={`notification-item ${getColorClass()}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        {notification.message && (
          <div className="notification-message">{notification.message}</div>
        )}
      </div>
      <button
        className="notification-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        <X size={18} />
      </button>

      <style>{`
        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-left: 4px solid;
          animation: slideIn 0.3s ease-out;
          min-width: 300px;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .notification-success {
          border-left-color: #10b981;
        }

        .notification-error {
          border-left-color: #ef4444;
        }

        .notification-warning {
          border-left-color: #f59e0b;
        }

        .notification-info {
          border-left-color: #3b82f6;
        }

        .notification-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notification-success .notification-icon {
          color: #10b981;
        }

        .notification-error .notification-icon {
          color: #ef4444;
        }

        .notification-warning .notification-icon {
          color: #f59e0b;
        }

        .notification-info .notification-icon {
          color: #3b82f6;
        }

        .notification-content {
          flex: 1;
        }

        .notification-title {
          font-weight: 600;
          font-size: 14px;
          color: #1a202c;
          margin-bottom: 4px;
        }

        .notification-message {
          font-size: 13px;
          color: #4a5568;
          line-height: 1.5;
        }

        .notification-close {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: none;
          color: #718096;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .notification-close:hover {
          background-color: #f7fafc;
          color: #1a202c;
        }

        @media (max-width: 640px) {
          .notification-item {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};
