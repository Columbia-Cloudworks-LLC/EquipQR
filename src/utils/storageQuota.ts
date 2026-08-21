/**
 * Storage Quota Management
 * Enforces 5GB limit per organization for image storage
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface StorageQuotaCheck {
  canUpload: boolean;
  currentStorageGB: number;
  maxStorageGB: number;
  fileSizeMB: number;
  wouldExceed: boolean;
  remainingGB: number;
  usagePercent: number;
}

const MAX_STORAGE_GB = 5;

function isQuotaRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBoolean(record: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function parseStorageQuotaCheck(data: unknown, fileSizeBytes: number): StorageQuotaCheck {
  const record = isQuotaRecord(data) ? data : {};
  return {
    canUpload: readBoolean(record, 'can_upload', 'canUpload') ?? true,
    currentStorageGB: readNumber(record, 'current_storage_gb', 'currentStorageGB') ?? 0,
    maxStorageGB: readNumber(record, 'max_storage_gb', 'maxStorageGB') ?? MAX_STORAGE_GB,
    fileSizeMB: readNumber(record, 'file_size_mb', 'fileSizeMB') ?? (fileSizeBytes / (1024 * 1024)),
    wouldExceed: readBoolean(record, 'would_exceed', 'wouldExceed') ?? false,
    remainingGB: readNumber(record, 'remaining_gb', 'remainingGB') ?? MAX_STORAGE_GB,
    usagePercent: readNumber(record, 'usage_percent', 'usagePercent') ?? 0,
  };
}

/**
 * Check if organization can upload a file of specified size
 */
export async function checkStorageQuota(
  organizationId: string,
  fileSizeBytes: number
): Promise<StorageQuotaCheck> {
  try {
    const { data, error } = await supabase.rpc('check_storage_limit', {
      org_id: organizationId,
      file_size_bytes: fileSizeBytes,
      max_storage_gb: MAX_STORAGE_GB
    });

    if (error) {
      logger.error('Error checking storage quota', error);
      // If there's an error, allow upload but log it
      return {
        canUpload: true,
        currentStorageGB: 0,
        maxStorageGB: MAX_STORAGE_GB,
        fileSizeMB: fileSizeBytes / (1024 * 1024),
        wouldExceed: false,
        remainingGB: MAX_STORAGE_GB,
        usagePercent: 0
      };
    }

    // If data is null or undefined, return default values
    if (!data) {
      logger.warn('Storage quota check returned null/undefined, allowing upload');
      return {
        canUpload: true,
        currentStorageGB: 0,
        maxStorageGB: MAX_STORAGE_GB,
        fileSizeMB: fileSizeBytes / (1024 * 1024),
        wouldExceed: false,
        remainingGB: MAX_STORAGE_GB,
        usagePercent: 0
      };
    }

    return parseStorageQuotaCheck(data, fileSizeBytes);
  } catch (error) {
    logger.error('Failed to check storage quota', error);
    // Fail open - allow upload on error
    return {
      canUpload: true,
      currentStorageGB: 0,
      maxStorageGB: MAX_STORAGE_GB,
      fileSizeMB: fileSizeBytes / (1024 * 1024),
      wouldExceed: false,
      remainingGB: MAX_STORAGE_GB,
      usagePercent: 0
    };
  }
}

/**
 * Validate file size before upload
 * Throws error if quota exceeded
 */
export async function validateStorageQuota(
  organizationId: string,
  fileSizeBytes: number
): Promise<void> {
  const quotaCheck = await checkStorageQuota(organizationId, fileSizeBytes);

  if (!quotaCheck.canUpload) {
    const usedGB = (quotaCheck.currentStorageGB || 0).toFixed(2);
    const maxGB = quotaCheck.maxStorageGB || MAX_STORAGE_GB;
    const fileMB = (quotaCheck.fileSizeMB || fileSizeBytes / (1024 * 1024)).toFixed(2);
    const remainingGB = (quotaCheck.remainingGB || 0).toFixed(2);

    throw new Error(
      `Storage limit reached. ` +
      `Your organization is using ${usedGB} GB of ${maxGB} GB (${quotaCheck.usagePercent || 0}%). ` +
      `Cannot upload ${fileMB} MB - only ${remainingGB} GB remaining. ` +
      `Please delete some images to free up space.`
    );
  }
}

/**
 * Format storage quota error message for UI
 */
export function getStorageQuotaErrorMessage(quota: StorageQuotaCheck): string {
  const remainingGB = (quota.remainingGB || 0).toFixed(2);
  const maxGB = quota.maxStorageGB || MAX_STORAGE_GB;
  return `Storage limit reached. You have ${remainingGB} GB remaining of ${maxGB} GB. Please delete some images to free up space.`;
}

export { MAX_STORAGE_GB };

