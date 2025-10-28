/**
 * Storage Quota Management
 * Enforces 5GB limit per organization for image storage
 */

import { supabase } from '@/integrations/supabase/client';

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
      console.error('Error checking storage quota:', error);
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

    return data as StorageQuotaCheck;
  } catch (error) {
    console.error('Failed to check storage quota:', error);
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
 * Get current storage usage for an organization
 */
export async function getCurrentStorage(organizationId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_organization_storage_mb', {
      org_id: organizationId
    });

    if (error) {
      console.error('Error getting storage:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Failed to get storage:', error);
    return 0;
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
    const usedGB = quotaCheck.currentStorageGB.toFixed(2);
    const maxGB = quotaCheck.maxStorageGB;
    const fileMB = quotaCheck.fileSizeMB.toFixed(2);
    const remainingGB = quotaCheck.remainingGB.toFixed(2);

    throw new Error(
      `Storage limit reached. ` +
      `Your organization is using ${usedGB} GB of ${maxGB} GB (${quotaCheck.usagePercent}%). ` +
      `Cannot upload ${fileMB} MB - only ${remainingGB} GB remaining. ` +
      `Please delete some images to free up space.`
    );
  }
}

/**
 * Format storage quota error message for UI
 */
export function getStorageQuotaErrorMessage(quota: StorageQuotaCheck): string {
  return `Storage limit reached. You have ${quota.remainingGB.toFixed(2)} GB remaining of ${quota.maxStorageGB} GB. Please delete some images to free up space.`;
}

export { MAX_STORAGE_GB };

