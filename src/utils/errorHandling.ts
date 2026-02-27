import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ErrorCategory = 'network' | 'permission' | 'validation' | 'server' | 'unknown';

export interface StandardError {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  action?: string;
  retryable?: boolean;
  context?: Record<string, unknown>;
}

// Common error patterns for Supabase
const SUPABASE_ERROR_PATTERNS: Record<
  string,
  { category: ErrorCategory; severity: ErrorSeverity }
> = {
  'Invalid input': { category: 'validation', severity: 'warning' },
  'Permission denied': { category: 'permission', severity: 'error' },
  'Network error': { category: 'network', severity: 'error' },
  'Failed to fetch': { category: 'network', severity: 'error' },
  'Load failed': { category: 'network', severity: 'error' },
  'NetworkError': { category: 'network', severity: 'error' },
  'ERR_INTERNET_DISCONNECTED': { category: 'network', severity: 'error' },
  'ERR_NETWORK': { category: 'network', severity: 'error' },
  'JWT expired': { category: 'permission', severity: 'warning' },
  'Row level security': { category: 'permission', severity: 'error' },
  'duplicate key': { category: 'validation', severity: 'warning' },
  'foreign key': { category: 'validation', severity: 'warning' },
};

/**
 * Fast, reliable check for network-related errors.
 * Uses navigator.onLine as primary signal (instant, no string matching)
 * and falls back to regex pattern matching on error messages.
 *
 * This is the canonical check used by the offline queue to decide
 * whether to save data locally instead of losing it.
 */
export const isNetworkError = (error?: unknown): boolean => {
  // Primary signal: browser definitively reports offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;

  // Secondary: match known network error message patterns
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return /Failed to fetch|Load failed|NetworkError|ERR_INTERNET|ERR_NETWORK|net::|TypeError: Failed|Operation failed/i.test(msg);
};

export const classifyError = (error: unknown): StandardError => {
  const errorMessage = getErrorMessage(error);
  const errorId = generateErrorId();

  // Fast-path: check for network errors first (most common offline scenario)
  if (isNetworkError(error)) {
    return {
      id: errorId,
      message: errorMessage,
      category: 'network',
      severity: 'error',
      action: getActionForError('network'),
      retryable: true,
      context: { originalError: error },
    };
  }
  
  // Check for known Supabase patterns
  for (const [pattern, classification] of Object.entries(SUPABASE_ERROR_PATTERNS)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return {
        id: errorId,
        message: errorMessage,
        category: classification.category,
        severity: classification.severity,
        action: getActionForError(classification.category),
        retryable: isRetryable(classification.category),
        context: { originalError: error }
      };
    }
  }
  
  // Default classification
  return {
    id: errorId,
    message: errorMessage,
    category: 'unknown',
    severity: 'error',
    action: 'Please try again or contact support if the problem persists.',
    retryable: true,
    context: { originalError: error }
  };
};

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
};

export const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getActionForError = (category: ErrorCategory): string => {
  switch (category) {
    case 'network':
      return 'Check your internet connection and try again.';
    case 'permission':
      return 'Contact your administrator for access permissions.';
    case 'validation':
      return 'Please check your input and correct any errors.';
    case 'server':
      return 'Our servers are experiencing issues. Please try again in a few minutes.';
    default:
      return 'Please try again or contact support if the problem persists.';
  }
};

export const isRetryable = (category: ErrorCategory): boolean => {
  return ['network', 'server', 'unknown'].includes(category);
};

export const showErrorToast = (error: unknown, context?: string): StandardError => {
  const standardError = classifyError(error);
  
  const title = context ? `${context} Failed` : 'Operation Failed';
  const description = `${standardError.message}${standardError.action ? ` ${standardError.action}` : ''}`;
  
  switch (standardError.severity) {
    case 'critical':
    case 'error':
      toast.error(title, { description });
      break;
    case 'warning':
      toast.warning(title, { description });
      break;
    case 'info':
      toast.info(title, { description });
      break;
  }
  
  // Log error for debugging
  logger.error(`[${standardError.id}] ${context || 'Error'}`, {
    ...standardError,
    timestamp: new Date().toISOString()
  });
  
  return standardError;
};

export const createRetryFunction = <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): (() => Promise<T>) => {
  return async (): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const standardError = classifyError(error);

        if (!standardError.retryable || attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
    }

    throw lastError;
  };
};
