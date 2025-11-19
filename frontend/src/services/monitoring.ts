/**
 * Monitoring and Error Tracking Service
 *
 * Centralized monitoring for performance and error tracking.
 * Ready for integration with Sentry, LogRocket, or other services.
 */

interface ErrorContext {
  user?: {
    id: string;
    email: string;
  };
  extra?: Record<string, any>;
  tags?: Record<string, string>;
}

class MonitoringService {
  private enabled: boolean;
  private environment: string;

  constructor() {
    this.enabled = import.meta.env.PROD;
    this.environment = import.meta.env.MODE || 'development';
  }

  /**
   * Initialize monitoring service
   * Call this in App.tsx or main.tsx
   */
  init() {
    if (!this.enabled) {
      console.log('[Monitoring] Running in development mode - monitoring disabled');
      return;
    }

    // Initialize Sentry (if VITE_SENTRY_DSN is provided)
    if (import.meta.env.VITE_SENTRY_DSN) {
      this.initSentry();
    }

    // Initialize performance monitoring
    this.initPerformanceMonitoring();

    // Initialize error listeners
    this.initErrorListeners();

    console.log('[Monitoring] Initialized successfully');
  }

  private initSentry() {
    // Placeholder for Sentry initialization
    // Install: npm install @sentry/react
    /*
    import * as Sentry from '@sentry/react';

    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: this.environment,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay(),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
    */
  }

  private initPerformanceMonitoring() {
    // Web Vitals monitoring
    if ('performance' in window && 'PerformanceObserver' in window) {
      // Monitor Core Web Vitals
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackMetric(entry.name, entry as any);
          }
        });

        observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
      } catch (err) {
        console.warn('[Monitoring] Performance observer not supported', err);
      }
    }
  }

  private initErrorListeners() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          extra: {
            promise: event.promise,
            reason: event.reason,
          },
          tags: {
            type: 'unhandled_promise',
          },
        }
      );
    });
  }

  /**
   * Capture an error with context
   */
  captureError(error: Error, context?: ErrorContext) {
    if (!this.enabled) {
      console.error('[Monitoring] Error:', error, context);
      return;
    }

    // Send to Sentry or other service
    // Sentry.captureException(error, { ...context });

    // Log to backend API
    this.logToBackend('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  /**
   * Capture a message/warning
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    if (!this.enabled) {
      console.log(`[Monitoring] ${level}:`, message, context);
      return;
    }

    // Send to Sentry or other service
    // Sentry.captureMessage(message, { level, ...context });

    this.logToBackend(level, {
      message,
      ...context,
    });
  }

  /**
   * Track custom events
   */
  trackEvent(eventName: string, properties?: Record<string, any>) {
    if (!this.enabled) {
      console.log('[Monitoring] Event:', eventName, properties);
      return;
    }

    // Send to analytics service
    this.logToBackend('event', {
      eventName,
      properties,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track performance metrics
   */
  trackMetric(metricName: string, value: any) {
    if (!this.enabled) {
      return;
    }

    // Send to monitoring service
    this.logToBackend('metric', {
      metricName,
      value,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; email: string; username?: string }) {
    if (!this.enabled) {
      return;
    }

    // Set user context in Sentry
    // Sentry.setUser(user);

    // Store in memory for backend logging
    (window as any).__flowforge_user = user;
  }

  /**
   * Clear user context (on logout)
   */
  clearUser() {
    if (!this.enabled) {
      return;
    }

    // Sentry.setUser(null);
    delete (window as any).__flowforge_user;
  }

  /**
   * Log to backend API
   */
  private async logToBackend(type: string, data: any) {
    try {
      const user = (window as any).__flowforge_user;

      await fetch(`${import.meta.env.VITE_API_URL}/api/monitoring/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
          user,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      // Fail silently - don't want monitoring to break the app
      console.error('[Monitoring] Failed to log to backend:', err);
    }
  }

  /**
   * Measure and track function execution time
   */
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.trackMetric(`function.${name}.duration`, duration);
      return result;
    } catch (err) {
      const duration = performance.now() - start;
      this.trackMetric(`function.${name}.error`, duration);
      throw err;
    }
  }

  /**
   * Track page views
   */
  trackPageView(path: string) {
    this.trackEvent('page_view', { path });
  }
}

export const monitoring = new MonitoringService();
export default monitoring;
