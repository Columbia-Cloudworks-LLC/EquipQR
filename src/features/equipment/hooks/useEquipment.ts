import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import {
  EquipmentService,
  EquipmentServiceFilters,
  EquipmentUpdateData,
  EquipmentSummary,
  EquipmentListFilters,
  EquipmentListResult,
  EquipmentWithTeam,
} from '@/features/equipment/services/EquipmentService';
import { PaginationParams } from '@/services/base/BaseService';
import {
  resolveEquipmentQuerySyncOptions,
  useEquipmentOrgBackgroundSync,
} from '@/hooks/equipmentQuerySync';
import { useAppToast } from '@/hooks/useAppToast';
import { createScopedQueryPersister } from '@/lib/queryPersistence';
import { equipment as equipmentKeys } from '@/lib/queryKeys';
import { getScanFollowUpEventsByEquipmentId } from '@/features/equipment/services/scanFollowUpEventService';
import { teamAccessQueryScope, resolveTeamReadScope } from '@/features/teams/utils/teamAccessScope';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { parseOfflineEquipPlaceholder } from '@/services/offlineQueuePlaceholders';
import { useQueuedItems, useQueuedTeamLookup } from '@/features/offline-queue/hooks/useQueuedLookups';
import {
  applyQueuedEquipmentUpdates,
  buildQueuedEquipmentRecord,
  findQueuedEquipmentCreate,
} from '@/features/offline-queue/utils/queuedEquipment';

/**
 * Stable references for the empty default arguments used by `useEquipment`.
 * Re-using a single instance keeps `useMemo` / effect deps that downstream
 * components key off the equipment query stable, even though TanStack Query
 * already structurally hashes the query key.
 */
const EMPTY_EQUIPMENT_FILTERS: EquipmentServiceFilters = Object.freeze({}) as EquipmentServiceFilters;
const EMPTY_EQUIPMENT_PAGINATION: PaginationParams = Object.freeze({}) as PaginationParams;

function fieldReadPersister() {
  return createScopedQueryPersister().persisterFn;
}

/**
 * Unified hook for equipment data fetching
 * Consolidates useEquipmentByOrganization, useOptimizedEquipment, useEnhancedOptimizedEquipment, useSyncEquipmentByOrganization
 */
export const useEquipment = (
  organizationId?: string,
  filters: EquipmentServiceFilters = EMPTY_EQUIPMENT_FILTERS,
  pagination: PaginationParams = EMPTY_EQUIPMENT_PAGINATION,
  options?: {
    enableBackgroundSync?: boolean;
    staleTime?: number;
  }
) => {
  const { enableSync, staleTime, gcTime } = resolveEquipmentQuerySyncOptions(options);

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
    gcTime,
  });

  useEquipmentOrgBackgroundSync(organizationId, enableSync);

  return query;
};

/**
 * Server-paginated equipment list for the dense list page. Returns rows
 * for the current page PLUS the total filtered count so pagination
 * controls don't need a second round trip. The query key includes filters
 * + pagination + sort so toggling any of them yields a new cache entry.
 *
 * On Slow 4G this is the difference between a ~500-row payload and a
 * 10-row payload — by far the biggest single field-UX win in the offline
 * / cellular plan.
 */
export const useEquipmentList = (
  organizationId: string | undefined,
  filters: EquipmentListFilters = {},
  pagination: { page?: number; pageSize?: number; sortField?: string; sortDirection?: 'asc' | 'desc' } = {},
  options?: { staleTime?: number; enabled?: boolean }
) => {
  const staleTime = options?.staleTime ?? 5 * 60 * 1000;
  const enabled = options?.enabled ?? true;

  return useQuery<EquipmentListResult>({
    queryKey: [
      'equipment',
      organizationId,
      'paginated',
      filters,
      pagination,
    ],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 };
      const result = await EquipmentService.getFilteredList(
        organizationId,
        filters,
        pagination,
      );
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch equipment list');
    },
    enabled: enabled && !!organizationId,
    staleTime,
    // Keep the previous page visible while a new page request flies — on
    // cellular the user otherwise sees a flash of empty state on every
    // page click, which feels broken even though it isn't.
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Lightweight per-org equipment summaries for selector / dropdown / offline-merge use cases.
 *
 * Use this instead of `useEquipment` whenever the caller only needs the
 * fields exposed by `EquipmentSummary` (id/name/manufacturer/model/serial/
 * status/team/location/image/working_hours/last_maintenance/last_known_location).
 * On Slow 4G the payload is meaningfully smaller than `select('*')` and the
 * page renders sooner.
 *
 * The query key is intentionally distinct from `useEquipment`'s list key —
 * mutations that touch an individual equipment row should invalidate
 * `['equipment', organizationId]` (see `useUpdateEquipment` below) and
 * `setQueryData` callers should target the by-id key, not the summary list.
 */
export const useEquipmentSummaries = (
  organizationId?: string,
  options?: {
    userTeamIds?: string[];
    isOrgAdmin?: boolean;
    staleTime?: number;
    enabled?: boolean;
  }
) => {
  const staleTime = options?.staleTime ?? 5 * 60 * 1000;
  const enabled = options?.enabled ?? true;

  return useQuery<EquipmentSummary[]>({
    queryKey: ['equipment', organizationId, 'summaries', options?.userTeamIds, options?.isOrgAdmin],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await EquipmentService.getSummaries(organizationId, {
        userTeamIds: options?.userTeamIds,
        isOrgAdmin: options?.isOrgAdmin,
      });
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch equipment summaries');
    },
    enabled: enabled && !!organizationId,
    staleTime,
    gcTime: staleTime * 2,
  });
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
    enabled?: boolean;
    userTeamIds?: string[];
    isOrgAdmin?: boolean;
  }
): UseQueryResult<EquipmentWithTeam | undefined, Error> => {
  const { enableSync, staleTime } = resolveEquipmentQuerySyncOptions(options);
  const teamScope = resolveTeamReadScope(options);

  // Equipment created offline has no server record yet: show it from the
  // offline queue. Edits still waiting to sync (team, PM template, details)
  // are shown on top of whichever record is on screen.
  const queuedItems = useQueuedItems();
  const teamFor = useQueuedTeamLookup();
  const queuedRecord = useMemo(() => {
    const created = findQueuedEquipmentCreate(equipmentId, queuedItems);
    return created ? buildQueuedEquipmentRecord(created, teamFor) : undefined;
  }, [equipmentId, queuedItems, teamFor]);
  const isPlaceholder = !!equipmentId && parseOfflineEquipPlaceholder(equipmentId) !== null;
  const withQueuedUpdates = useCallback(
    (record: EquipmentWithTeam | undefined) =>
      record ? applyQueuedEquipmentUpdates(record, queuedItems, teamFor) : record,
    [queuedItems, teamFor],
  );

  const query = useQuery({
    queryKey:
      organizationId && equipmentId
        ? equipmentKeys.byIdScoped(
            organizationId,
            equipmentId,
            teamAccessQueryScope(teamScope.isOrgAdmin, teamScope.userTeamIds),
          )
        : ['equipment', organizationId, equipmentId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return undefined;
      const result = await EquipmentService.getById(organizationId, equipmentId, {
        userTeamIds: teamScope.userTeamIds,
        isOrgAdmin: teamScope.isOrgAdmin,
      });
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Equipment not found');
    },
    // A placeholder id is never sent to the server.
    enabled: !!organizationId && !!equipmentId && !isPlaceholder && (options?.enabled ?? true),
    staleTime,
    persister: fieldReadPersister(),
    placeholderData: queuedRecord,
    select: withQueuedUpdates,
  });

  useEquipmentOrgBackgroundSync(organizationId, enableSync, false);

  return query;
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
    queryKey: organizationId && equipmentId
      ? equipmentKeys.scans(organizationId, equipmentId)
      : ['equipment', organizationId, equipmentId, 'scans'],
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
 * Get scan follow-up events for equipment (actions performed from a QR scan
 * session, e.g. created work order, updated hours, added note). Feeds the
 * Scan History timeline alongside `useEquipmentScans`.
 */
export const useEquipmentScanFollowUps = (
  organizationId: string | undefined,
  equipmentId: string | undefined,
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? 10 * 60 * 1000;

  return useQuery({
    queryKey: organizationId && equipmentId
      ? equipmentKeys.scanFollowUps(organizationId, equipmentId)
      : ['equipment', organizationId, equipmentId, 'scan-follow-ups'],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      return getScanFollowUpEventsByEquipmentId(organizationId, equipmentId);
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
 * Update equipment mutation
 */
export const useUpdateEquipment = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();
  const { user } = useAuth();
  const offlineCtx = useOfflineQueueOptional();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EquipmentUpdateData }) => {
      if (!organizationId) throw new Error('Organization ID required');
      // Goes through the offline-aware service so a change made with no
      // connection (team, PM template, details) is queued instead of lost.
      // Equipment created offline is addressed by its placeholder id, which
      // sync swaps for the real one.
      if (user?.id && (!navigator.onLine || parseOfflineEquipPlaceholder(id) !== null)) {
        const service = new OfflineAwareWorkOrderService(organizationId, user.id);
        const queued = await service.updateEquipment(id, data);
        if (queued.queuedOffline) {
          offlineCtx?.refresh();
          return null;
        }
      }
      const result = await EquipmentService.update(organizationId, id, data);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to update equipment');
    },
    onSuccess: (data, variables) => {
      if (data === null) {
        toast({
          title: 'Saved offline',
          description: 'This change will sync when your connection returns.',
          variant: 'success',
        });
        return;
      }
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
 * Create scan mutation
 * Records a scan event for equipment (e.g., QR code scan)
 */
export const useCreateScan = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({ equipmentId, location, notes, includeProfile }: {
      equipmentId: string; 
      location?: string; 
      notes?: string;
      includeProfile?: boolean;
    }) => {
      if (!organizationId) throw new Error('Organization ID required');
      const result = await EquipmentService.createScan(organizationId, equipmentId, location, notes, {
        includeProfile,
      });
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to log scan');
    },
    onSuccess: (_data, variables) => {
      if (organizationId) {
        // Invalidate scans + scan-history queries for this equipment
        queryClient.invalidateQueries({
          queryKey: equipmentKeys.scans(organizationId, variables.equipmentId),
        });
        queryClient.invalidateQueries({
          queryKey: equipmentKeys.scanFollowUps(organizationId, variables.equipmentId),
        });
      }
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
 * ManufacturerWithModels - Grouped by manufacturer with their models
 */
export interface ManufacturerWithModels {
  manufacturer: string;
  models: string[];
}

/**
 * Get distinct manufacturer/model combinations for equipment.
 * Used for populating compatibility rule dropdowns.
 */
export const useEquipmentManufacturersAndModels = (
  organizationId: string | undefined,
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? 10 * 60 * 1000; // 10 minutes - this data changes rarely

  return useQuery({
    queryKey: ['equipment-manufacturers-models', organizationId],
    queryFn: async (): Promise<ManufacturerWithModels[]> => {
      if (!organizationId) return [];

      // Use the lightweight summaries projection rather than `select('*')` —
      // we only need manufacturer/model strings here, not the full equipment row.
      const result = await EquipmentService.getSummaries(organizationId);
      if (!result.success || !result.data) {
        return [];
      }

      // Group by manufacturer and collect unique models
      const manufacturerMap = new Map<string, Set<string>>();

      for (const equip of result.data) {
        if (!equip.manufacturer) continue;

        const mfr = equip.manufacturer.trim();
        if (!manufacturerMap.has(mfr)) {
          manufacturerMap.set(mfr, new Set());
        }

        if (equip.model) {
          manufacturerMap.get(mfr)!.add(equip.model.trim());
        }
      }

      // Convert to sorted array
      const manufacturersList: ManufacturerWithModels[] = [];
      for (const [manufacturer, modelsSet] of manufacturerMap) {
        manufacturersList.push({
          manufacturer,
          models: Array.from(modelsSet).sort((a, b) => a.localeCompare(b))
        });
      }

      return manufacturersList.sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
    },
    enabled: !!organizationId,
    staleTime,
  });
};

