import { describe, it, expect, beforeEach } from 'vitest';
import { BaseService, type ApiResponse, type PaginationParams, type FilterParams } from './BaseService';

// Test implementation of BaseService
class TestService extends BaseService {
  constructor(organizationId: string) {
    super(organizationId);
  }

  // Public methods to test protected methods
  public testHandleError(error: unknown): ApiResponse<null> {
    return this.handleError(error);
  }

  public testHandleErrorTyped<T>(error: unknown): ApiResponse<T> {
    return this.handleError(error);
  }

  public testHandleSuccess<T>(data: T): ApiResponse<T> {
    return this.handleSuccess(data);
  }

  public getOrganizationId(): string {
    return this.organizationId;
  }
}

describe('BaseService', () => {
  let service: TestService;
  const organizationId = 'org-1';

  beforeEach(() => {
    service = new TestService(organizationId);
  });

  describe('constructor', () => {
    it('should set organization ID', () => {
      expect(service.getOrganizationId()).toBe(organizationId);
    });
  });

  describe('handleError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error message');
      const result = service.testHandleError(error);

      expect(result).toEqual({
        data: null,
        error: 'Test error message',
        success: false,
      });
    });

    it('should handle string errors', () => {
      const error = 'String error message';
      const result = service.testHandleError(error);

      expect(result).toEqual({
        data: null,
        error: 'Operation failed',
        success: false,
      });
    });

    it('should handle null/undefined errors', () => {
      const result1 = service.testHandleError(null);
      const result2 = service.testHandleError(undefined);

      expect(result1).toEqual({
        data: null,
        error: 'Operation failed',
        success: false,
      });

      expect(result2).toEqual({
        data: null,
        error: 'Operation failed',
        success: false,
      });
    });

    it('should handle objects with message property', () => {
      const error = { message: 'Custom error message' };
      const result = service.testHandleError(error);

      expect(result).toEqual({
        data: null,
        error: 'Operation failed',
        success: false,
      });
    });

    it('should handle unknown error types', () => {
      const error = { customProperty: 'value' };
      const result = service.testHandleError(error);

      expect(result).toEqual({
        data: null,
        error: 'Operation failed',
        success: false,
      });
    });

    it('should return a typed error response matching the caller data type', () => {
      const result: ApiResponse<string[]> = service.testHandleErrorTyped(new Error('Typed fail'));

      expect(result).toEqual({
        data: null,
        error: 'Typed fail',
        success: false,
      });
    });
  });

  describe('handleSuccess', () => {
    it('should handle string data', () => {
      const data = 'success data';
      const result = service.testHandleSuccess(data);

      expect(result).toEqual({
        data: 'success data',
        error: null,
        success: true,
      });
    });

    it('should handle object data', () => {
      const data = { id: 1, name: 'test' };
      const result = service.testHandleSuccess(data);

      expect(result).toEqual({
        data: { id: 1, name: 'test' },
        error: null,
        success: true,
      });
    });

    it('should handle array data', () => {
      const data = [1, 2, 3];
      const result = service.testHandleSuccess(data);

      expect(result).toEqual({
        data: [1, 2, 3],
        error: null,
        success: true,
      });
    });

    it('should handle null data', () => {
      const data = null;
      const result = service.testHandleSuccess(data);

      expect(result).toEqual({
        data: null,
        error: null,
        success: true,
      });
    });

    it('should handle boolean data', () => {
      const result1 = service.testHandleSuccess(true);
      const result2 = service.testHandleSuccess(false);

      expect(result1).toEqual({
        data: true,
        error: null,
        success: true,
      });

      expect(result2).toEqual({
        data: false,
        error: null,
        success: true,
      });
    });
  });

  describe('type definitions', () => {
    it('should have correct ApiResponse type', () => {
      const successResponse: ApiResponse<string> = {
        data: 'test',
        error: null,
        success: true,
      };

      const errorResponse: ApiResponse<null> = {
        data: null,
        error: 'error message',
        success: false,
      };

      expect(successResponse.success).toBe(true);
      expect(errorResponse.success).toBe(false);
    });

    it('should have correct PaginationParams type', () => {
      const paginationParams: PaginationParams = {
        page: 1,
        limit: 25,
        sortBy: 'created_at',
        sortOrder: 'desc',
      };

      expect(paginationParams.page).toBe(1);
      expect(paginationParams.sortOrder).toBe('desc');
    });

    it('should allow optional pagination params', () => {
      const minimalParams: PaginationParams = {};
      
      expect(minimalParams.page).toBeUndefined();
      expect(minimalParams.limit).toBeUndefined();
    });
  });
});