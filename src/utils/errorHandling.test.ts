import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifyError,
  getErrorMessage,
  generateErrorId,
  getActionForError,
  isRetryable,
  showErrorToast
} from './errorHandling';

// Mock toast and logger
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  }
}));

describe('errorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error object', () => {
      expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
    });

    it('should return string as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should extract message from object with message property', () => {
      expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
    });

    it('should return default message for unknown types', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(getErrorMessage(123)).toBe('An unexpected error occurred');
    });
  });

  describe('generateErrorId', () => {
    it('should generate unique error IDs', () => {
      const id1 = generateErrorId();
      const id2 = generateErrorId();
      
      expect(id1).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('getActionForError', () => {
    it('should return appropriate action for network errors', () => {
      expect(getActionForError('network')).toContain('internet connection');
    });

    it('should return appropriate action for permission errors', () => {
      expect(getActionForError('permission')).toContain('administrator');
    });

    it('should return appropriate action for validation errors', () => {
      expect(getActionForError('validation')).toContain('check your input');
    });

    it('should return appropriate action for server errors', () => {
      expect(getActionForError('server')).toContain('servers are experiencing');
    });

    it('should return default action for unknown errors', () => {
      expect(getActionForError('unknown')).toContain('try again or contact support');
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable categories', () => {
      expect(isRetryable('network')).toBe(true);
      expect(isRetryable('server')).toBe(true);
      expect(isRetryable('unknown')).toBe(true);
    });

    it('should return false for non-retryable categories', () => {
      expect(isRetryable('permission')).toBe(false);
      expect(isRetryable('validation')).toBe(false);
    });
  });

  describe('classifyError', () => {
    it('should classify Supabase permission errors', () => {
      const error = classifyError(new Error('Permission denied'));
      expect(error.category).toBe('permission');
      expect(error.severity).toBe('error');
      expect(error.retryable).toBe(false);
    });

    it('should classify Supabase validation errors', () => {
      const error = classifyError(new Error('Invalid input'));
      expect(error.category).toBe('validation');
      expect(error.severity).toBe('warning');
      expect(error.retryable).toBe(false);
    });

    it('should classify Supabase network errors', () => {
      const error = classifyError(new Error('Network error'));
      expect(error.category).toBe('network');
      expect(error.severity).toBe('error');
      expect(error.retryable).toBe(true);
    });

    it('should classify JWT expired errors', () => {
      const error = classifyError(new Error('JWT expired'));
      expect(error.category).toBe('permission');
      expect(error.severity).toBe('warning');
    });

    it('should classify duplicate key errors', () => {
      const error = classifyError(new Error('duplicate key'));
      expect(error.category).toBe('validation');
      expect(error.severity).toBe('warning');
    });

    it('should default to unknown for unrecognized errors', () => {
      const error = classifyError(new Error('Some random error'));
      expect(error.category).toBe('unknown');
      expect(error.severity).toBe('error');
      expect(error.retryable).toBe(true);
    });

    it('should include error ID and context', () => {
      const error = classifyError(new Error('Test error'));
      expect(error.id).toMatch(/^err_/);
      expect(error.context).toEqual({ originalError: new Error('Test error') });
    });
  });

  describe('showErrorToast', () => {
    it('should show error toast for error severity', async () => {
      const { toast } = await import('sonner');
      const error = showErrorToast(new Error('Test error'), 'Operation');
      
      expect(toast.error).toHaveBeenCalledWith(
        'Operation Failed',
        expect.objectContaining({
          description: expect.stringContaining('Test error')
        })
      );
      expect(error.severity).toBe('error');
    });

    it('should show warning toast for warning severity', async () => {
      const { toast } = await import('sonner');
      showErrorToast(new Error('Invalid input'), 'Operation');
      
      expect(toast.warning).toHaveBeenCalled();
    });

    it('should log error with logger', async () => {
      const { logger } = await import('@/utils/logger');
      showErrorToast(new Error('Test error'));
      
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
