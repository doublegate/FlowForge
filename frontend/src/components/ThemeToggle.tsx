/**
 * Theme Toggle Component
 *
 * Provides a button to toggle between light and dark themes.
 * Shows current theme with appropriate icon.
 *
 * @module components/ThemeToggle
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={20} />;
      case 'dark':
        return <Moon size={20} />;
      case 'auto':
        return <Monitor size={20} />;
    }
  };

  const handleThemeSelect = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="theme-toggle-container" ref={dropdownRef}>
      <button
        className="theme-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        title="Change theme"
      >
        {getIcon()}
      </button>

      {isOpen && (
        <div className="theme-dropdown">
          <button
            className={`theme-option ${theme === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeSelect('light')}
          >
            <Sun size={18} />
            <span>Light</span>
          </button>

          <button
            className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeSelect('dark')}
          >
            <Moon size={18} />
            <span>Dark</span>
          </button>

          <button
            className={`theme-option ${theme === 'auto' ? 'active' : ''}`}
            onClick={() => handleThemeSelect('auto')}
          >
            <Monitor size={18} />
            <span>Auto</span>
          </button>
        </div>
      )}

      <style>{`
        .theme-toggle-container {
          position: relative;
        }

        .theme-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 140px;
          background-color: var(--color-bg-elevated);
          border: 1px solid var(--color-border-primary);
          border-radius: 8px;
          box-shadow: var(--shadow-lg);
          padding: 4px;
          z-index: 1000;
          animation: fadeIn 0.15s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .theme-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 8px 12px;
          background: none;
          border: none;
          border-radius: 6px;
          color: var(--color-text-primary);
          font-size: 14px;
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .theme-option:hover {
          background-color: var(--color-bg-tertiary);
        }

        .theme-option.active {
          background-color: var(--color-primary);
          color: white;
        }

        .theme-option.active:hover {
          background-color: var(--color-primary-dark);
        }

        .theme-option svg {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default ThemeToggle;
