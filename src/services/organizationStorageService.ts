/**
 * Organization Storage Service - Canonical service for storage operations
 * 
 * This file consolidates storage-related operations from optimizedOrganizationStorageService.
 * Import from here instead of using optimizedOrganizationStorageService.
 */

import { logger } from '../utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { monitorQuery } from '@/utils/queryMonitoring';
import type { StorageUsage, StorageUsageData } from '@/types/organization';

// Re-export types for backward compatibility
export type { StorageUsage, StorageUsageData };

/**
 * Organization Storage Service class
 * Provides methods for calculating and managing organization storage usage
 */
export class OrganizationStorageService {
  /**
   * Fetches storage usage for an organization using optimized JOIN queries
   */
  static async getOrganizationStorageUsage(organizationId: string): Promise<StorageUsage> {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    try {
      // Fetch equipment image storage with organization filtering
      const equipmentImageData = await monitorQuery(
        'equipment_images_storage_by_org',
        async () => {
          const { data, error } = await supabase
            .from('equipment_note_images')
            .select(`
              file_size,
              equipment_note_id,
              equipment_notes!inner (
                equipment_id,
                equipment!inner (
                  organization_id
                )
              )
            `)
            .eq('equipment_notes.equipment.organization_id', organizationId);

          if (error) throw error;
          return data || [];
        },
        ['idx_equipment_note_images_note_id', 'idx_equipment_notes_equipment_id', 'idx_equipment_organization_id']
      );

      // Fetch work order image storage with organization filtering
      // Using separate queries to avoid PostgREST relationship issues
      const workOrderImageData = await monitorQuery(
        'work_order_images_storage_by_org',
        async () => {
          // First get work order IDs for the organization
          const { data: workOrders, error: workOrderError } = await supabase
            .from('work_orders')
            .select('id')
            .eq('organization_id', organizationId);

          if (workOrderError) throw workOrderError;
          
          if (!workOrders || workOrders.length === 0) {
            return [];
          }

          const workOrderIds = workOrders.map(wo => wo.id);

          // Then get images for those work orders
          const { data: images, error: imageError } = await supabase
            .from('work_order_images')
            .select('file_size, work_order_id')
            .in('work_order_id', workOrderIds);

          if (imageError) throw imageError;
          return images || [];
        },
        ['idx_work_orders_organization_id', 'idx_work_order_images_work_order_id']
      );

      // Server-side aggregation
      const equipmentImageSizeBytes = equipmentImageData.reduce(
        (sum, img) => sum + (img.file_size || 0), 
        0
      );
      
      const workOrderImageSizeBytes = workOrderImageData.reduce(
        (sum, img) => sum + (img.file_size || 0), 
        0
      );

      const totalSizeBytes = equipmentImageSizeBytes + workOrderImageSizeBytes;
      const totalSizeMB = totalSizeBytes / (1024 * 1024);
      const totalSizeGB = totalSizeMB / 1024;
      
      const equipmentImageCount = equipmentImageData.length;
      const workOrderImageCount = workOrderImageData.length;
      const itemCount = equipmentImageCount + workOrderImageCount;
      
      // Storage pricing calculation
      const freeQuotaGB = 5;
      const freeQuotaMB = freeQuotaGB * 1024;
      const overageGB = Math.max(0, totalSizeGB - freeQuotaGB);
      const overageMB = overageGB * 1024;
      const costPerGB = 0.10;
      const overageCost = Math.round(overageGB * costPerGB * 100) / 100;

      return {
        totalSizeBytes,
        totalSizeMB,
        totalSizeGB,
        itemCount,
        equipmentImageCount,
        workOrderImageCount,
        equipmentImageSizeBytes,
        workOrderImageSizeBytes,
        freeQuotaMB,
        freeQuotaGB,
        overageMB,
        overageGB,
        costPerGB,
        overageCost
      };

    } catch (error) {
      logger.error('Error fetching organization storage usage:', error);
      throw new Error(`Failed to fetch storage usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets storage usage with detailed breakdown by type
   */
  static async getDetailedStorageBreakdown(organizationId: string): Promise<{
    equipment: StorageUsageData;
    workOrders: StorageUsageData;
    total: StorageUsageData;
  }> {
    const usage = await this.getOrganizationStorageUsage(organizationId);
    
    return {
      equipment: {
        totalSizeBytes: usage.equipmentImageSizeBytes,
        totalSizeMB: usage.equipmentImageSizeBytes / (1024 * 1024),
        totalSizeGB: usage.equipmentImageSizeBytes / (1024 * 1024 * 1024),
        itemCount: usage.equipmentImageCount,
        equipmentImageCount: usage.equipmentImageCount,
        workOrderImageCount: 0,
        equipmentImageSizeBytes: usage.equipmentImageSizeBytes,
        workOrderImageSizeBytes: 0
      },
      workOrders: {
        totalSizeBytes: usage.workOrderImageSizeBytes,
        totalSizeMB: usage.workOrderImageSizeBytes / (1024 * 1024),
        totalSizeGB: usage.workOrderImageSizeBytes / (1024 * 1024 * 1024),
        itemCount: usage.workOrderImageCount,
        equipmentImageCount: 0,
        workOrderImageCount: usage.workOrderImageCount,
        equipmentImageSizeBytes: 0,
        workOrderImageSizeBytes: usage.workOrderImageSizeBytes
      },
      total: {
        totalSizeBytes: usage.totalSizeBytes,
        totalSizeMB: usage.totalSizeMB,
        totalSizeGB: usage.totalSizeGB,
        itemCount: usage.itemCount,
        equipmentImageCount: usage.equipmentImageCount,
        workOrderImageCount: usage.workOrderImageCount,
        equipmentImageSizeBytes: usage.equipmentImageSizeBytes,
        workOrderImageSizeBytes: usage.workOrderImageSizeBytes
      }
    };
  }
}

/**
 * @deprecated Use OrganizationStorageService instead
 */
export const OptimizedOrganizationStorageService = OrganizationStorageService;

