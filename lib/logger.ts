/**
 * Environment-based logging utility
 * Only logs in development mode to reduce production bundle size and improve performance
 */

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Logs a message only in development mode
 */
export const log = (...args: any[]) => {
  if (isDevelopment) {
    console.log(...args)
  }
}

/**
 * Logs an error (always logged, even in production)
 */
export const logError = (...args: any[]) => {
  console.error(...args)
}

/**
 * Logs a warning only in development mode
 */
export const logWarn = (...args: any[]) => {
  if (isDevelopment) {
    console.warn(...args)
  }
}

/**
 * Logs debug information only in development mode
 */
export const logDebug = (...args: any[]) => {
  if (isDevelopment) {
    console.debug(...args)
  }
}

/**
 * Client-side logger (for use in client components)
 */
export const clientLog = {
  log: (...args: any[]) => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.log(...args)
    }
  },
  error: (...args: any[]) => {
    console.error(...args) // Always log errors
  },
  warn: (...args: any[]) => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.warn(...args)
    }
  },
  debug: (...args: any[]) => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.debug(...args)
    }
  },
}

