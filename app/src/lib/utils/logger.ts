// Simple logging utility with production error reporting

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: unknown;
}

/**
 * Log message with optional metadata
 * In dev: logs to console
 * In prod: sends errors to backend via beacon
 */
export function log(level: LogLevel, message: string, meta?: LogMeta): void {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...meta };
  
  // Always log to console in development
  if (import.meta.env.DEV) {
    console[level](message, meta);
  }
  
  // Send errors to backend in production
  if (import.meta.env.PROD && level === 'error') {
    try {
      navigator.sendBeacon('/api/logs', JSON.stringify(logEntry));
    } catch (e) {
      // Silently fail if beacon fails
      console.error('Failed to send error log', e);
    }
  }
}

/**
 * Measure and log page load performance
 */
export function measurePageLoad(): void {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('load', () => {
    try {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (perfData) {
        log('info', 'Page load timing', {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          duration: perfData.duration
        });
      }
    } catch (e) {
      log('warn', 'Failed to measure page load', { error: String(e) });
    }
  });
}
