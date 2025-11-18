/**
 * NotificationContext Tests
 *
 * Tests for the notification/toast system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import { NotificationProvider, useNotification } from '../contexts/NotificationContext';

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should provide notification methods', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: NotificationProvider,
    });

    expect(result.current.showNotification).toBeDefined();
    expect(result.current.removeNotification).toBeDefined();
    expect(result.current.success).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.warning).toBeDefined();
    expect(result.current.info).toBeDefined();
  });

  it('should add notification', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: NotificationProvider,
    });

    act(() => {
      result.current.success('Test Title', 'Test Message');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('success');
    expect(result.current.notifications[0].title).toBe('Test Title');
    expect(result.current.notifications[0].message).toBe('Test Message');
  });

  it('should auto-dismiss notification after duration', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: NotificationProvider,
    });

    act(() => {
      result.current.info('Test', 'Message', 1000);
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should manually remove notification', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: NotificationProvider,
    });

    act(() => {
      result.current.success('Test', 'Message');
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should handle multiple notifications', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: NotificationProvider,
    });

    act(() => {
      result.current.success('Success 1');
      result.current.error('Error 1');
      result.current.warning('Warning 1');
    });

    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.notifications[0].type).toBe('success');
    expect(result.current.notifications[1].type).toBe('error');
    expect(result.current.notifications[2].type).toBe('warning');
  });

  it('should render notification container', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: ({ children }) => <NotificationProvider>{children}</NotificationProvider>,
    });

    act(() => {
      result.current.success('Test Notification', 'This is a test');
    });

    expect(screen.queryByText('Test Notification')).toBeTruthy();
    expect(screen.queryByText('This is a test')).toBeTruthy();
  });

  it('should throw error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useNotification());
    }).toThrow('useNotification must be used within a NotificationProvider');

    spy.mockRestore();
  });
});
