/**
 * useKeyboardShortcuts Hook Tests
 *
 * Tests for keyboard shortcuts functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  const createKeyboardEvent = (key: string, modifiers: any = {}) => {
    return new KeyboardEvent('keydown', {
      key,
      ctrlKey: modifiers.ctrl || false,
      shiftKey: modifiers.shift || false,
      altKey: modifiers.alt || false,
      metaKey: modifiers.meta || false,
      bubbles: true,
      cancelable: true,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register keyboard shortcuts', () => {
    const mockAction = vi.fn();
    const shortcuts = [
      { ...commonShortcuts.undo, action: mockAction },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));

    const event = createKeyboardEvent('z', { ctrl: true });
    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockAction).toHaveBeenCalled();
  });

  it('should not trigger when disabled', () => {
    const mockAction = vi.fn();
    const shortcuts = [
      { ...commonShortcuts.undo, action: mockAction },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: false }));

    const event = createKeyboardEvent('z', { ctrl: true });
    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it('should handle multiple modifiers', () => {
    const mockAction = vi.fn();
    const shortcuts = [
      { key: 's', ctrl: true, shift: true, description: 'Save as', action: mockAction },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));

    const event = createKeyboardEvent('s', { ctrl: true, shift: true });
    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockAction).toHaveBeenCalled();
  });

  it('should not trigger in input fields', () => {
    const mockAction = vi.fn();
    const shortcuts = [
      { ...commonShortcuts.delete, action: mockAction },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));

    // Create an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = createKeyboardEvent('Delete');
    act(() => {
      input.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should cleanup event listeners on unmount', () => {
    const mockAction = vi.fn();
    const shortcuts = [
      { ...commonShortcuts.undo, action: mockAction },
    ];

    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ shortcuts, enabled: true })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should handle case-insensitive keys', () => {
    const mockAction = vi.fn();
    const shortcuts = [
      { key: 'a', ctrl: true, description: 'Select all', action: mockAction },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));

    const event = createKeyboardEvent('A', { ctrl: true });
    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockAction).toHaveBeenCalled();
  });

  it('should format shortcuts correctly', () => {
    expect(commonShortcuts.undo.key).toBe('z');
    expect(commonShortcuts.undo.ctrl).toBe(true);
    expect(commonShortcuts.save.key).toBe('s');
    expect(commonShortcuts.save.ctrl).toBe(true);
    expect(commonShortcuts.help.key).toBe('?');
    expect(commonShortcuts.help.shift).toBe(true);
  });

  it('should handle multiple shortcuts', () => {
    const undoAction = vi.fn();
    const redoAction = vi.fn();
    const saveAction = vi.fn();

    const shortcuts = [
      { ...commonShortcuts.undo, action: undoAction },
      { ...commonShortcuts.redo, action: redoAction },
      { ...commonShortcuts.save, action: saveAction },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }));

    act(() => {
      document.dispatchEvent(createKeyboardEvent('z', { ctrl: true }));
    });
    expect(undoAction).toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(createKeyboardEvent('y', { ctrl: true }));
    });
    expect(redoAction).toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(createKeyboardEvent('s', { ctrl: true }));
    });
    expect(saveAction).toHaveBeenCalled();
  });
});
