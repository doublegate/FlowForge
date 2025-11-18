/**
 * UserProfile Component
 *
 * Displays user information and provides logout functionality.
 * Shows in the top-right corner of the workspace.
 *
 * @module components/UserProfile
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  return (
    <div className="user-profile-container" ref={dropdownRef}>
      <button
        className="user-profile-button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-label="User menu"
        aria-expanded={isDropdownOpen}
      >
        <div className="user-avatar">
          <User size={18} />
        </div>
        <span className="user-name">{user.displayName || user.username}</span>
        <ChevronDown
          size={16}
          className={`chevron ${isDropdownOpen ? 'rotate' : ''}`}
        />
      </button>

      {isDropdownOpen && (
        <div className="user-dropdown">
          <div className="dropdown-header">
            <div className="user-info">
              <div className="user-display-name">
                {user.displayName || user.username}
              </div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>

          <div className="dropdown-divider" />

          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={() => console.log('Settings')}>
              <Settings size={16} />
              <span>Settings</span>
            </button>

            <div className="dropdown-divider" />

            <button className="dropdown-item logout" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .user-profile-container {
          position: relative;
          z-index: 50;
        }

        .user-profile-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          font-size: 14px;
        }

        .user-profile-button:hover {
          background: #f7fafc;
          border-color: #cbd5e0;
        }

        .user-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50%;
        }

        .user-name {
          font-weight: 500;
          color: #333;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .chevron {
          color: #718096;
          transition: transform 0.2s ease;
        }

        .chevron.rotate {
          transform: rotate(180deg);
        }

        .user-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 240px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          animation: dropdownFadeIn 0.2s ease-out;
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-header {
          padding: 16px;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .user-display-name {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .user-email {
          font-size: 12px;
          color: #718096;
        }

        .dropdown-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 8px 0;
        }

        .dropdown-menu {
          padding: 8px;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          background: none;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
          font-family: inherit;
          font-size: 14px;
          color: #333;
          text-align: left;
        }

        .dropdown-item:hover {
          background: #f7fafc;
        }

        .dropdown-item.logout {
          color: #e53e3e;
        }

        .dropdown-item.logout:hover {
          background: #fed7d7;
        }

        .dropdown-item svg {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default UserProfile;
