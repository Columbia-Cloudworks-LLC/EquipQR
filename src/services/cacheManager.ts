import { QueryClient, type QueryKey } from '@tanstack/react-query';
import {
  equipment,
  organization,
  team,
  teams,
  workOrders,
} from '@/lib/queryKeys';

/** True when `queryKey` begins with every segment of `prefix` (structural, not substring). */
export function queryKeyMatchesPrefix(queryKey: QueryKey, prefix: QueryKey): boolean {
  if (prefix.length === 0 || prefix.length > queryKey.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (queryKey[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
}

// PHASE 3: Centralized cache invalidation and management
export class CacheManager {
  private static instance: CacheManager;
  private queryClient: QueryClient | null = null;
  private invalidationQueue: Set<string> = new Set();
  private syncInProgress = false;

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  setQueryClient(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // Centralized cache invalidation patterns
  invalidateOrganizationData(organizationId: string) {
    if (!this.queryClient) return;
    
    const patterns = [
      ['teams-optimized', organizationId],
      ['work-orders-optimized', organizationId],
      ['equipment-optimized', organizationId],
      ['dashboard-optimized', organizationId],
      ['notes', organizationId],
      ['scans', organizationId],
      ['organization-members', organizationId],
      ['organization-admins', organizationId],
      ['organization-slots', organizationId],
      ['slot-availability', organizationId],
      ['slot-purchases', organizationId],
      ['organization-invitations', organizationId]
    ];

    patterns.forEach(pattern => {
      this.queryClient!.invalidateQueries({ queryKey: pattern });
    });
  }

  // Smart invalidation based on data relationships
  invalidateEquipmentRelated(organizationId: string, equipmentId: string) {
    if (!this.queryClient) return;

    // Invalidate equipment data
    this.queryClient.invalidateQueries({ 
      queryKey: ['equipment-optimized', organizationId] 
    });
    
    // Invalidate work orders for this equipment
    this.queryClient.invalidateQueries({ 
      queryKey: ['work-orders', 'equipment', organizationId, equipmentId] 
    });
    
    // Invalidate equipment notes
    this.queryClient.invalidateQueries({ 
      queryKey: ['notes', organizationId, equipmentId] 
    });

    // Update dashboard stats
    this.queryClient.invalidateQueries({ 
      queryKey: ['dashboard-optimized', organizationId] 
    });
  }

  invalidateWorkOrderRelated(organizationId: string, workOrderId: string, equipmentId?: string) {
    if (!this.queryClient) return;

    // Invalidate work orders
    this.queryClient.invalidateQueries({ 
      queryKey: ['work-orders-optimized', organizationId] 
    });
    
    // If equipment is specified, invalidate equipment-related data
    // (invalidateEquipmentRelated already invalidates dashboard-optimized)
    if (equipmentId) {
      this.invalidateEquipmentRelated(organizationId, equipmentId);
    }

    // Equipment-less path only — avoid a second dashboard refetch when equipmentId is set
    if (!equipmentId) {
      this.queryClient.invalidateQueries({
        queryKey: ['dashboard-optimized', organizationId],
      });
    }
  }

  invalidateTeamRelated(organizationId: string, teamId: string) {
    if (!this.queryClient) return;

    // Invalidate teams data
    this.queryClient.invalidateQueries({ 
      queryKey: ['teams-optimized', organizationId] 
    });
    this.queryClient.invalidateQueries({
      queryKey: ['team', organizationId, teamId]
    });
    
    // Invalidate work orders (team assignments might have changed)
    this.queryClient.invalidateQueries({ 
      queryKey: ['work-orders-optimized', organizationId] 
    });
  }

  // Organization member related invalidation
  invalidateOrganizationMemberRelated(organizationId: string) {
    if (!this.queryClient) return;

    // Invalidate all member-related queries
    this.queryClient.invalidateQueries({ 
      queryKey: ['organization-members', organizationId] 
    });
    this.queryClient.invalidateQueries({ 
      queryKey: ['organization-admins', organizationId] 
    });
    
    // Update dashboard stats
    this.queryClient.invalidateQueries({ 
      queryKey: ['dashboard-optimized', organizationId] 
    });
  }

  // Organization slot related invalidation
  invalidateOrganizationSlotRelated(organizationId: string) {
    if (!this.queryClient) return;

    // Invalidate all slot-related queries
    this.queryClient.invalidateQueries({ 
      queryKey: ['organization-slots', organizationId] 
    });
    this.queryClient.invalidateQueries({ 
      queryKey: ['slot-availability', organizationId] 
    });
    this.queryClient.invalidateQueries({ 
      queryKey: ['slot-purchases', organizationId] 
    });
  }

  // Organization invitation related invalidation
  invalidateOrganizationInvitationRelated(organizationId: string) {
    if (!this.queryClient) return;

    // Invalidate invitation queries
    this.queryClient.invalidateQueries({ 
      queryKey: ['organization-invitations', organizationId] 
    });
    
    // Also invalidate slot data as invitations can affect slot usage
    this.invalidateOrganizationSlotRelated(organizationId);
  }

  // Batch invalidation to reduce re-renders
  batchInvalidate(organizationId: string, operations: Array<{
    type: 'equipment' | 'workOrder' | 'team' | 'organization' | 'organizationMember' | 'organizationSlot' | 'organizationInvitation';
    id?: string;
    equipmentId?: string;
  }>) {
    if (!this.queryClient) return;

    // Store real query-key prefixes (not flattened strings) to avoid substring false positives.
    const uniqueInvalidations = new Map<string, QueryKey>();
    const addPattern = (pattern: QueryKey) => {
      uniqueInvalidations.set(pattern.map(String).join('\0'), pattern);
    };

    const orgKeys = organization(organizationId);
    const teamListKeys = teams(organizationId);

    operations.forEach(op => {
      switch (op.type) {
        case 'equipment':
          if (op.id) {
            addPattern(equipment.list(organizationId));
            addPattern(equipment.byId(organizationId, op.id));
            addPattern(workOrders.equipmentWorkOrders(organizationId, op.id));
            addPattern(equipment.notes(op.id, organizationId));
            addPattern(orgKeys.dashboardStats());
            // Legacy prefixes still used by other CacheManager helpers
            addPattern(['equipment-optimized', organizationId]);
            addPattern(['work-orders', 'equipment', organizationId, op.id]);
            addPattern(['notes', organizationId, op.id]);
            addPattern(['dashboard-optimized', organizationId]);
          }
          break;
        case 'workOrder':
          addPattern(workOrders.list(organizationId));
          addPattern(workOrders.optimized(organizationId));
          addPattern(orgKeys.dashboardStats());
          addPattern(['work-orders-optimized', organizationId]);
          addPattern(['dashboard-optimized', organizationId]);
          if (op.equipmentId) {
            addPattern(equipment.list(organizationId));
            addPattern(workOrders.equipmentWorkOrders(organizationId, op.equipmentId));
            addPattern(equipment.notes(op.equipmentId, organizationId));
            addPattern(['equipment-optimized', organizationId]);
            addPattern(['work-orders', 'equipment', organizationId, op.equipmentId]);
            addPattern(['notes', organizationId, op.equipmentId]);
          }
          break;
        case 'team':
          addPattern(teamListKeys.root);
          addPattern(teamListKeys.optimized());
          if (op.id) {
            addPattern(team(op.id).root);
            addPattern(['team', organizationId, op.id]);
          }
          addPattern(workOrders.list(organizationId));
          addPattern(['teams-optimized', organizationId]);
          addPattern(['work-orders-optimized', organizationId]);
          break;
        case 'organization':
          addPattern(orgKeys.dashboardStats());
          addPattern(['dashboard-optimized', organizationId]);
          addPattern(['dashboard-trends', organizationId]);
          addPattern(['dashboardStats', organizationId]);
          break;
        case 'organizationMember':
          addPattern(orgKeys.members());
          addPattern(orgKeys.membersOptimized());
          addPattern(orgKeys.dashboardStats());
          addPattern(['organization-members', organizationId]);
          addPattern(['organization-admins', organizationId]);
          addPattern(['dashboard-optimized', organizationId]);
          break;
        case 'organizationSlot':
          addPattern(orgKeys.slots());
          addPattern(orgKeys.slotAvailability());
          addPattern(orgKeys.slotPurchases());
          addPattern(['organization-slots', organizationId]);
          addPattern(['slot-availability', organizationId]);
          addPattern(['slot-purchases', organizationId]);
          break;
        case 'organizationInvitation':
          addPattern(orgKeys.invitations());
          addPattern(orgKeys.slotAvailability());
          addPattern(['organization-invitations', organizationId]);
          addPattern(['slot-availability', organizationId]);
          break;
        default: {
          const _exhaustive: never = op.type;
          void _exhaustive;
          break;
        }
      }
    });

    const patterns = Array.from(uniqueInvalidations.values());

    // Execute batch invalidation with structural prefix matching
    this.queryClient.invalidateQueries({
      predicate: (query) =>
        patterns.some((pattern) => queryKeyMatchesPrefix(query.queryKey, pattern)),
    });
  }

  // Optimistic updates with rollback
  async optimisticUpdate<T>(
    queryKey: QueryKey,
    updater: (old: T | undefined) => T,
    mutationFn: () => Promise<unknown>
  ): Promise<void> {
    if (!this.queryClient) return;

    // Cancel outgoing refetches
    await this.queryClient.cancelQueries({ queryKey });

    // Snapshot previous value
    const previousData = this.queryClient.getQueryData<T>(queryKey);

    // Optimistically update
    this.queryClient.setQueryData<T>(queryKey, updater);

    try {
      await mutationFn();
    } catch (error) {
      // Rollback on error
      this.queryClient.setQueryData(queryKey, previousData);
      throw error;
    }
  }

  // Get cache statistics
  getCacheStats() {
    if (!this.queryClient) return null;

    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length
    };
  }

  // Clear specific patterns
  clearCache(pattern?: string) {
    if (!this.queryClient) return;

    if (pattern) {
      this.queryClient.removeQueries({
        predicate: (query) => query.queryKey.some(key => 
          String(key).includes(pattern)
        )
      });
    } else {
      this.queryClient.clear();
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();
