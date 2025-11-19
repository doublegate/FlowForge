/**
 * ThemeContext Tests
 *
 * Tests for the ThemeContext provider and useTheme hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should provide default theme as auto', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('auto');
  });

  it('should load theme from localStorage', () => {
    localStorage.setItem('flowforge_theme', 'dark');

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should set theme and save to localStorage', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(localStorage.setItem).toHaveBeenCalledWith('flowforge_theme', 'light');
  });

  it('should resolve auto theme based on system preference', () => {
    // Mock dark mode preference
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should update resolved theme when system preference changes', () => {
    let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event, listener) => {
        if (event === 'change') {
          mediaQueryListener = listener;
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.resolvedTheme).toBe('light');

    // Simulate system theme change
    if (mediaQueryListener) {
      act(() => {
        mediaQueryListener({ matches: true } as MediaQueryListEvent);
      });
    }

    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    spy.mockRestore();
  });
});
