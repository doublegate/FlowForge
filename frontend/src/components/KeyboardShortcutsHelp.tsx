/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays all available keyboard shortcuts in a modal.
 * Can be triggered with Shift+? or via menu.
 *
 * @module components/KeyboardShortcutsHelp
 * @version 1.0.0
 */

import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { formatShortcut, type KeyboardShortcut } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts,
  onClose,
}) => {
  // Group shortcuts by category
  const groupedShortcuts = {
    'General': shortcuts.filter(s => ['save', 'find', 'help', 'escape'].some(k => s.key.toLowerCase().includes(k))),
    'Editing': shortcuts.filter(s => ['undo', 'redo', 'copy', 'paste', 'cut', 'delete', 'selectall'].some(k => s.description.toLowerCase().includes(k))),
    'View': shortcuts.filter(s => ['zoom', 'fit'].some(k => s.description.toLowerCase().includes(k))),
  };

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <Keyboard size={24} />
            <h2>Keyboard Shortcuts</h2>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={category} className="shortcut-group">
                <h3>{category}</h3>
                <div className="shortcut-list">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="shortcut-item">
                      <span className="shortcut-description">{shortcut.description}</span>
                      <kbd className="shortcut-keys">{formatShortcut(shortcut)}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <p>Press <kbd>Shift + ?</kbd> to toggle this help</p>
        </div>
      </div>

      <style>{`
        .keyboard-shortcuts-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .keyboard-shortcuts-modal {
          background-color: var(--color-bg-elevated);
          border-radius: 12px;
          box-shadow: var(--shadow-xl);
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--color-border-primary);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .header-title svg {
          color: var(--color-primary);
        }

        .close-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: none;
          border-radius: 6px;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .close-button:hover {
          background-color: var(--color-bg-tertiary);
          color: var(--color-text-primary);
        }

        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .shortcut-group {
          margin-bottom: 24px;
        }

        .shortcut-group:last-child {
          margin-bottom: 0;
        }

        .shortcut-group h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .shortcut-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shortcut-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background-color: var(--color-bg-secondary);
          border-radius: 6px;
        }

        .shortcut-description {
          font-size: 14px;
          color: var(--color-text-primary);
        }

        .shortcut-keys {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background-color: var(--color-bg-primary);
          border: 1px solid var(--color-border-primary);
          border-radius: 4px;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-primary);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--color-border-primary);
          text-align: center;
        }

        .modal-footer p {
          margin: 0;
          font-size: 13px;
          color: var(--color-text-tertiary);
        }

        .modal-footer kbd {
          padding: 2px 6px;
          background-color: var(--color-bg-secondary);
          border: 1px solid var(--color-border-primary);
          border-radius: 3px;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-size: 12px;
        }

        /* Scrollbar styling */
        .modal-content::-webkit-scrollbar {
          width: 8px;
        }

        .modal-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .modal-content::-webkit-scrollbar-thumb {
          background: var(--color-border-secondary);
          border-radius: 4px;
        }

        .modal-content::-webkit-scrollbar-thumb:hover {
          background: var(--color-border-primary);
        }

        /* Responsive */
        @media (max-width: 640px) {
          .keyboard-shortcuts-modal {
            width: 95%;
            max-height: 90vh;
          }

          .modal-header {
            padding: 16px;
          }

          .modal-content {
            padding: 16px;
          }

          .shortcut-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default KeyboardShortcutsHelp;
