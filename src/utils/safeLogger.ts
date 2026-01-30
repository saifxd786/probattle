/**
 * Safe logging utility that prevents sensitive data leakage in production
 */

const isDev = import.meta.env.DEV;

// Patterns to detect sensitive data
const sensitivePatterns = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /credential/i,
  /session/i,
  /bearer/i,
  /upi_id/i,
  /bank/i,
  /card/i,
  /security_answer/i,
];

// Sanitize object by removing sensitive fields
const sanitizeObject = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Check if key matches sensitive patterns
    const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// Extract safe error info
const getSafeError = (error: unknown): string => {
  if (error instanceof Error) {
    // Only return error message, not full stack in production
    if (isDev) {
      return `${error.name}: ${error.message}\n${error.stack}`;
    }
    // In production, return generic message
    return `Error: ${error.name}`;
  }
  return 'An error occurred';
};

/**
 * Safe console.log - only logs in development
 */
export const safeLog = (...args: unknown[]): void => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Safe console.warn - sanitizes and logs
 */
export const safeWarn = (...args: unknown[]): void => {
  if (isDev) {
    console.warn(...args);
  } else {
    // In production, log sanitized version
    const sanitized = args.map(arg => 
      typeof arg === 'object' ? sanitizeObject(arg) : arg
    );
    console.warn('[WARN]', ...sanitized);
  }
};

/**
 * Safe console.error - prevents sensitive data leakage
 */
export const safeError = (context: string, error?: unknown, additionalData?: Record<string, unknown>): void => {
  if (isDev) {
    // Full logging in development
    console.error(`[${context}]`, error, additionalData);
  } else {
    // Sanitized logging in production
    const safeErrorMsg = error ? getSafeError(error) : 'Unknown error';
    const sanitizedData = additionalData ? sanitizeObject(additionalData) : undefined;
    
    console.error(`[${context}]`, safeErrorMsg, sanitizedData || '');
  }
};

/**
 * Debug log - only in development
 */
export const debugLog = (context: string, ...args: unknown[]): void => {
  if (isDev) {
    console.log(`[DEBUG:${context}]`, ...args);
  }
};

/**
 * Create a scoped logger for a component/module
 */
export const createLogger = (scope: string) => ({
  log: (...args: unknown[]) => safeLog(`[${scope}]`, ...args),
  warn: (...args: unknown[]) => safeWarn(`[${scope}]`, ...args),
  error: (error?: unknown, additionalData?: Record<string, unknown>) => 
    safeError(scope, error, additionalData),
  debug: (...args: unknown[]) => debugLog(scope, ...args),
});

export default {
  log: safeLog,
  warn: safeWarn,
  error: safeError,
  debug: debugLog,
  createLogger,
};
