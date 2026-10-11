import { logger } from '@/utils/logger';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: unknown;
}

export abstract class BaseService {
  protected organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  protected handleError<T>(error: unknown): ApiResponse<T> {
    logger.error('Service error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Operation failed',
      success: false
    };
  }

  protected handleSuccess<T>(data: T): ApiResponse<T> {
    return {
      data,
      error: null,
      success: true
    };
  }
}
