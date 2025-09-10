/**
 * Enhanced Base Service class
 * Provides standardized error handling, response formatting, and common service patterns
 * Follows SOLID principles with dependency inversion
 */

import { logger } from '../../utils/logger';
import { 
  ApiResponse, 
  PaginationParams, 
  FilterParams, 
  QueryOptions,
  PaginatedResult 
} from '../types/common';
import { ERROR_CODES } from '../constants';

export abstract class BaseService {
  protected organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Handle errors with standardized response format
   */
  protected handleError(error: unknown, context?: string): ApiResponse<null> {
    const errorMessage = error instanceof Error ? error.message : 'Operation failed';
    const contextMessage = context ? ` in ${context}` : '';
    
    logger.error(`Service error${contextMessage}:`, error);
    
    return {
      data: null,
      error: errorMessage,
      success: false,
      message: `Failed to ${context || 'complete operation'}`
    };
  }

  /**
   * Handle successful operations with standardized response format
   */
  protected handleSuccess<T>(data: T, message?: string): ApiResponse<T> {
    return {
      data,
      error: null,
      success: true,
      message: message || 'Operation completed successfully'
    };
  }

  /**
   * Handle successful operations with pagination
   */
  protected handlePaginatedSuccess<T>(
    data: T[], 
    pagination: PaginatedResult<T>['pagination'],
    message?: string
  ): ApiResponse<PaginatedResult<T>> {
    return {
      data: {
        data,
        pagination
      },
      error: null,
      success: true,
      message: message || 'Data retrieved successfully'
    };
  }

  /**
   * Build filter query string from filter parameters
   */
  protected buildFilterQuery(filters: FilterParams): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    return params.toString();
  }

  /**
   * Validate required fields
   */
  protected validateRequiredFields(data: Record<string, any>, requiredFields: string[]): string[] {
    const missingFields: string[] = [];
    
    requiredFields.forEach(field => {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(field);
      }
    });
    
    return missingFields;
  }

  /**
   * Validate data against schema
   */
  protected validateData<T>(data: T, validator: (data: T) => boolean, errorMessage: string): boolean {
    if (!validator(data)) {
      throw new Error(errorMessage);
    }
    return true;
  }

  /**
   * Sanitize input data
   */
  protected sanitizeInput(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .trim();
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  /**
   * Check if user has permission for operation
   */
  protected async checkPermission(
    userId: string, 
    operation: string, 
    resourceId?: string
  ): Promise<boolean> {
    // This should be implemented by subclasses or injected dependency
    // For now, return true as a placeholder
    logger.info(`Permission check for user ${userId}, operation ${operation}, resource ${resourceId}`);
    return true;
  }

  /**
   * Get organization context for queries
   */
  protected getOrganizationContext(): { organization_id: string } {
    return { organization_id: this.organizationId };
  }

  /**
   * Add organization filter to query
   */
  protected addOrganizationFilter(filters: FilterParams = {}): FilterParams {
    return {
      ...filters,
      ...this.getOrganizationContext()
    };
  }

  /**
   * Handle async operations with error catching
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<ApiResponse<T>> {
    try {
      const result = await operation();
      return this.handleSuccess(result);
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Cache key generator
   */
  protected generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${this.organizationId}:${parts.join(':')}`;
  }

  /**
   * Log operation start
   */
  protected logOperationStart(operation: string, context?: Record<string, any>): void {
    logger.info(`Starting ${operation}`, {
      organizationId: this.organizationId,
      ...context
    });
  }

  /**
   * Log operation completion
   */
  protected logOperationComplete(operation: string, duration: number, context?: Record<string, any>): void {
    logger.info(`Completed ${operation} in ${duration}ms`, {
      organizationId: this.organizationId,
      ...context
    });
  }

  /**
   * Get error code from error
   */
  protected getErrorCode(error: unknown): string {
    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.message.includes('permission')) {
        return ERROR_CODES.AUTHORIZATION_ERROR;
      }
      if (error.message.includes('not found')) {
        return ERROR_CODES.NOT_FOUND;
      }
      if (error.message.includes('validation')) {
        return ERROR_CODES.VALIDATION_ERROR;
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return ERROR_CODES.NETWORK_ERROR;
      }
    }
    return ERROR_CODES.UNKNOWN_ERROR;
  }

  /**
   * Format error message for user display
   */
  protected formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // Remove technical details for user-facing messages
      return error.message
        .replace(/Error: /g, '')
        .replace(/at .*/g, '')
        .trim();
    }
    return 'An unexpected error occurred';
  }

  /**
   * Get organization ID
   */
  getOrganizationId(): string {
    return this.organizationId;
  }

  /**
   * Set organization ID (useful for context switching)
   */
  setOrganizationId(organizationId: string): void {
    this.organizationId = organizationId;
  }
}
