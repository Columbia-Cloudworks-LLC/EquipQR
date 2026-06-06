import { logger } from '@/utils/logger';
import type { ApiResponse } from '@/services/base/BaseService';

/** Standalone services that do not extend BaseService use these helpers. */
export function createServiceErrorResponse(
  error: unknown,
  logLabel: string,
): ApiResponse<null> {
  logger.error(`${logLabel}:`, error);
  return {
    data: null,
    error: error instanceof Error ? error.message : 'Operation failed',
    success: false,
  };
}

export function createServiceSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    error: null,
    success: true,
  };
}
