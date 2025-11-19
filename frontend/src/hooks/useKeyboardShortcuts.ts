/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcut handling for canvas operations.
 * Supports common shortcuts like undo/redo, copy/paste, etc.
 *
 * @module hooks/useKeyboardShortcuts
 * @version 1.0.0
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Check if a keyboard event matches a shortcut
 */
const matchesShortcut = (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
  const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatches = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
  const shiftMatches = !!shortcut.shift === event.shiftKey;
  const altMatches = !!shortcut.alt === event.altKey;

  return keyMatches && ctrlMatches && shiftMatches && altMatches;
};

/**
 * Hook to handle keyboard shortcuts
 */
export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

/**
 * Format shortcut for display
 */
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());

  return parts.join('+');
};

/**
 * Common shortcut presets
 */
export const commonShortcuts = {
  undo: { key: 'z', ctrl: true, description: 'Undo last action' },
  redo: { key: 'y', ctrl: true, description: 'Redo last action' },
  redoAlt: { key: 'z', ctrl: true, shift: true, description: 'Redo last action' },
  copy: { key: 'c', ctrl: true, description: 'Copy selected nodes' },
  paste: { key: 'v', ctrl: true, description: 'Paste copied nodes' },
  cut: { key: 'x', ctrl: true, description: 'Cut selected nodes' },
  delete: { key: 'Delete', description: 'Delete selected nodes' },
  selectAll: { key: 'a', ctrl: true, description: 'Select all nodes' },
  save: { key: 's', ctrl: true, description: 'Save workflow' },
  find: { key: 'f', ctrl: true, description: 'Find actions' },
  help: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
  escape: { key: 'Escape', description: 'Cancel/Close' },
  zoomIn: { key: '+', ctrl: true, description: 'Zoom in' },
  zoomOut: { key: '-', ctrl: true, description: 'Zoom out' },
  fitView: { key: '0', ctrl: true, description: 'Fit view' },
};
