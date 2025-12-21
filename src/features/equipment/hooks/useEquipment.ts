import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { EquipmentService, EquipmentFilters, EquipmentCreateData, EquipmentUpdateData } from '@/features/equipment/services/EquipmentService';
import { PaginationParams } from '@/services/base/BaseService';
import { useBackgroundSync } from '@/hooks/useCacheInvalidation';
import { performanceMonitor } from '@/utils/performanceMonitoring';
import { useAppToast } from '@/hooks/useAppToast';

/**
 * Unified hook for equipment data fetching
 * Consolidates useEquipmentByOrganization, useOptimizedEquipment, useEnhancedOptimizedEquipment, useSyncEquipmentByOrganization
 */
export const useEquipment = (
  organizationId?: string,
  filters: EquipmentFilters = {},
  pagination: PaginationParams = {},
  options?: {
    enableBackgroundSync?: boolean;
    staleTime?: number;
  }
) => {
  const { subscribeToOrganization } = useBackgroundSync();
  const enableSync = options?.enableBackgroundSync ?? false;
  const staleTime = options?.staleTime ?? 5 * 60 * 1000; // 5 minutes default

  const query = useQuery({
    queryKey: ['equipment', organizationId, filters, pagination],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await EquipmentService.getAll(organizationId, filters, pagination);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch equipment');
    },
    enabled: !!organizationId,
    staleTime,
    gcTime: staleTime * 2, // Keep in cache for 2x stale time
  });

  // Background sync if enabled
  useEffect(() => {
    if (organizationId && enableSync) {
      subscribeToOrganization(organizationId);
      performanceMonitor.recordMetric('equipment-query-init', 1);
    }
  }, [organizationId, enableSync, subscribeToOrganization]);

  return query;
};

/**
 * Get equipment by ID
 */
export const useEquipmentById = (
  organizationId: string | undefined,
  equipmentId: string | undefined,
  options?: {
    enableBackgroundSync?: boolean;
    staleTime?: number;
  }
) => {
  const { subscribeToOrganization } = useBackgroundSync();
  const enableSync = options?.enableBackgroundSync ?? false;
  const staleTime = options?.staleTime ?? 5 * 60 * 1000;

  const query = useQuery({
    queryKey: ['equipment', organizationId, equipmentId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return undefined;
      const result = await EquipmentService.getById(organizationId, equipmentId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Equipment not found');
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime,
  });

  useEffect(() => {
    if (organizationId && enableSync) {
      subscribeToOrganization(organizationId);
    }
  }, [organizationId, enableSync, subscribeToOrganization]);

  return query;
};

/**
 * Get notes for equipment
 */
export const useEquipmentNotes = (
  organizationId: string | undefined,
  equipmentId: string | undefined,
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? 5 * 60 * 1000;

  return useQuery({
    queryKey: ['equipment-notes', organizationId, equipmentId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      const result = await EquipmentService.getNotesByEquipmentId(organizationId, equipmentId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch notes');
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime,
  });
};

/**
 * Get scans for equipment
 */
export const useEquipmentScans = (
  organizationId: string | undefined,
  equipmentId: string | undefined,
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? 10 * 60 * 1000; // 10 minutes for scans

  return useQuery({
    queryKey: ['equipment-scans', organizationId, equipmentId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      const result = await EquipmentService.getScansByEquipmentId(organizationId, equipmentId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch scans');
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime,
  });
};

/**
 * Get work orders for equipment
 */
export const useEquipmentWorkOrders = (
  organizationId: string | undefined,
  equipmentId: string | undefined,
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? 3 * 60 * 1000; // 3 minutes for work orders

  return useQuery({
    queryKey: ['equipment-work-orders', organizationId, equipmentId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      const result = await EquipmentService.getWorkOrdersByEquipmentId(organizationId, equipmentId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch work orders');
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime,
  });
};

/**
 * Create equipment mutation
 */
export const useCreateEquipment = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async (data: EquipmentCreateData) => {
      if (!organizationId) throw new Error('Organization ID required');
      const result = await EquipmentService.create(organizationId, data);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to create equipment');
    },
    onSuccess: (data) => {
      // Invalidate equipment queries
      queryClient.invalidateQueries({ queryKey: ['equipment', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', organizationId] });
      toast({
        title: 'Equipment Created',
        description: `${data.name} has been added successfully`,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create equipment',
        variant: 'error',
      });
    },
  });
};

/**
 * Update equipment mutation
 */
export const useUpdateEquipment = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EquipmentUpdateData }) => {
      if (!organizationId) throw new Error('Organization ID required');
      const result = await EquipmentService.update(organizationId, id, data);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to update equipment');
    },
    onSuccess: (data, variables) => {
      // Invalidate equipment queries
      queryClient.invalidateQueries({ queryKey: ['equipment', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['equipment', organizationId, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['equipment-notes', organizationId, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['equipment-scans', organizationId, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['equipment-work-orders', organizationId, variables.id] });
      toast({
        title: 'Equipment Updated',
        description: `${data.name} has been updated successfully`,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update equipment',
        variant: 'error',
      });
    },
  });
};

/**
 * Delete equipment mutation
 */
export const useDeleteEquipment = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('Organization ID required');
      const result = await EquipmentService.delete(organizationId, id);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to delete equipment');
    },
    onSuccess: () => {
      // Invalidate equipment queries
      queryClient.invalidateQueries({ queryKey: ['equipment', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', organizationId] });
      toast({
        title: 'Equipment Deleted',
        description: 'Equipment has been deleted successfully',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'Failed to delete equipment',
        variant: 'error',
      });
    },
  });
};

/**
 * Create scan mutation
 * Records a scan event for equipment (e.g., QR code scan)
 */
export const useCreateScan = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({ equipmentId, location, notes }: { 
      equipmentId: string; 
      location?: string; 
      notes?: string 
    }) => {
      if (!organizationId) throw new Error('Organization ID required');
      const result = await EquipmentService.createScan(organizationId, equipmentId, location, notes);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to log scan');
    },
    onSuccess: (_data, variables) => {
      // Invalidate scans queries for this equipment
      queryClient.invalidateQueries({ 
        queryKey: ['equipment-scans', organizationId, variables.equipmentId] 
      });
      // Also invalidate legacy query keys for backward compatibility
      queryClient.invalidateQueries({ 
        queryKey: ['scans', 'equipment', organizationId, variables.equipmentId] 
      });
      toast({
        title: 'Scan Logged',
        description: 'Equipment scan has been recorded successfully',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to log scan',
        variant: 'error',
      });
    },
  });
};

/**
 * Create note mutation
 * Creates a basic note for equipment (without images)
 * For notes with images, use the equipmentNotesService directly
 */
export const useCreateNote = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({ equipmentId, content, isPrivate = false }: { 
      equipmentId: string; 
      content: string; 
      isPrivate?: boolean 
    }) => {
      if (!organizationId) throw new Error('Organization ID required');
      const result = await EquipmentService.createNote(organizationId, equipmentId, content, isPrivate);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to create note');
    },
    onSuccess: (_data, variables) => {
      // Invalidate notes queries for this equipment
      queryClient.invalidateQueries({ 
        queryKey: ['equipment-notes', organizationId, variables.equipmentId] 
      });
      // Also invalidate legacy query keys for backward compatibility
      queryClient.invalidateQueries({ 
        queryKey: ['notes', 'equipment', organizationId, variables.equipmentId] 
      });
      toast({
        title: 'Note Added',
        description: 'Your note has been saved successfully',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Note Failed',
        description: error instanceof Error ? error.message : 'Failed to save note',
        variant: 'error',
      });
    },
  });
};

/**
 * Get equipment status counts
 */
export const useEquipmentStatusCounts = (
  organizationId: string | undefined,
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? 2 * 60 * 1000; // 2 minutes for stats

  return useQuery({
    queryKey: ['equipment-status-counts', organizationId],
    queryFn: async () => {
      if (!organizationId) return { active: 0, maintenance: 0, inactive: 0 };
      const result = await EquipmentService.getStatusCounts(organizationId);
      if (result.success && result.data) {
        return result.data;
      }
      return { active: 0, maintenance: 0, inactive: 0 };
    },
    enabled: !!organizationId,
    staleTime,
  });
};

