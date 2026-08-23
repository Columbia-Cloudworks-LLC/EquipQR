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

  public testBuildFilterQuery(filters: FilterParams): string {
    return this.buildFilterQuery(filters);
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

  describe('buildFilterQuery', () => {
    it('should handle empty filters', () => {
      const result = service.testBuildFilterQuery({});
      expect(result).toBe('');
    });

    it('should build query string from filters', () => {
      const filters: FilterParams = {
        status: 'active',
        priority: 'high',
        assignee: 'user-1',
      };

      const result = service.testBuildFilterQuery(filters);
      
      // Parse the result to check all parameters are included
      const params = new URLSearchParams(result);
      expect(params.get('status')).toBe('active');
      expect(params.get('priority')).toBe('high');
      expect(params.get('assignee')).toBe('user-1');
    });

    it('should ignore undefined values', () => {
      const filters: FilterParams = {
        status: 'active',
        priority: undefined,
        assignee: 'user-1',
      };

      const result = service.testBuildFilterQuery(filters);
      const params = new URLSearchParams(result);
      
      expect(params.get('status')).toBe('active');
      expect(params.get('priority')).toBe(null);
      expect(params.get('assignee')).toBe('user-1');
    });

    it('should ignore null values', () => {
      const filters: FilterParams = {
        status: 'active',
        priority: null,
        assignee: 'user-1',
      };

      const result = service.testBuildFilterQuery(filters);
      const params = new URLSearchParams(result);
      
      expect(params.get('status')).toBe('active');
      expect(params.get('priority')).toBe(null);
      expect(params.get('assignee')).toBe('user-1');
    });

    it('should ignore empty string values', () => {
      const filters: FilterParams = {
        status: 'active',
        priority: '',
        assignee: 'user-1',
      };

      const result = service.testBuildFilterQuery(filters);
      const params = new URLSearchParams(result);
      
      expect(params.get('status')).toBe('active');
      expect(params.get('priority')).toBe(null);
      expect(params.get('assignee')).toBe('user-1');
    });

    it('should handle number values', () => {
      const filters: FilterParams = {
        page: 1,
        limit: 50,
        score: 0,
      };

      const result = service.testBuildFilterQuery(filters);
      const params = new URLSearchParams(result);
      
      expect(params.get('page')).toBe('1');
      expect(params.get('limit')).toBe('50');
      expect(params.get('score')).toBe('0');
    });

    it('should handle boolean values', () => {
      const filters: FilterParams = {
        active: true,
        archived: false,
      };

      const result = service.testBuildFilterQuery(filters);
      const params = new URLSearchParams(result);
      
      expect(params.get('active')).toBe('true');
      expect(params.get('archived')).toBe('false');
    });

    it('should handle array values by converting to string', () => {
      const filters: FilterParams = {
        tags: ['urgent', 'maintenance'],
        ids: [1, 2, 3],
      };

      const result = service.testBuildFilterQuery(filters);
      const params = new URLSearchParams(result);
      
      expect(params.get('tags')).toBe('urgent,maintenance');
      expect(params.get('ids')).toBe('1,2,3');
    });

    it('should handle complex filter combinations', () => {
      const filters: FilterParams = {
        status: 'active',
        priority: 'high',
        page: 1,
        limit: 25,
        assigned: true,
        tags: ['urgent'],
        excludeIds: null,
        search: '',
        includeArchived: undefined,
      };

      const result = service.testBuildFilterQuery(filters);
      const params = new URLSearchParams(result);
      
      expect(params.get('status')).toBe('active');
      expect(params.get('priority')).toBe('high');
      expect(params.get('page')).toBe('1');
      expect(params.get('limit')).toBe('25');
      expect(params.get('assigned')).toBe('true');
      expect(params.get('tags')).toBe('urgent');
      
      // These should be excluded
      expect(params.get('excludeIds')).toBe(null);
      expect(params.get('search')).toBe(null);
      expect(params.get('includeArchived')).toBe(null);
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