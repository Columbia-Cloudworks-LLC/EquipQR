import { toast } from 'sonner';

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
const SUPABASE_ERROR_PATTERNS = {
  'Invalid input': { category: 'validation' as ErrorCategory, severity: 'warning' as ErrorSeverity },
  'Permission denied': { category: 'permission' as ErrorCategory, severity: 'error' as ErrorSeverity },
  'Network error': { category: 'network' as ErrorCategory, severity: 'error' as ErrorSeverity },
  'JWT expired': { category: 'permission' as ErrorCategory, severity: 'warning' as ErrorSeverity },
  'Row level security': { category: 'permission' as ErrorCategory, severity: 'error' as ErrorSeverity },
  'duplicate key': { category: 'validation' as ErrorCategory, severity: 'warning' as ErrorSeverity },
  'foreign key': { category: 'validation' as ErrorCategory, severity: 'warning' as ErrorSeverity },
} as const;

export const classifyError = (error: unknown): StandardError => {
  const errorMessage = getErrorMessage(error);
  const errorId = generateErrorId();
  
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
  console.error(`[${standardError.id}] ${context || 'Error'}:`, {
    ...standardError,
    timestamp: new Date().toISOString()
  });
  
  return standardError;
};

export const createRetryFunction = (
  fn: () => Promise<unknown>,
  maxRetries: number = 3,
  delay: number = 1000
) => {
  return async (): Promise<unknown> => {
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
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
    
    throw lastError;
  };
};