// Duplication rationale: Service repeats org-scoped equipment resolution for filters
import { BaseService, ApiResponse, PaginationParams, FilterParams } from '@/services/base/BaseService';
import { applySupabasePaginationRange } from '@/services/supabaseQueryPagination';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Import and re-export unified types from the single source of truth
import {
  WorkOrder,
  WorkOrderCreateData,
  WorkOrderServiceFilters,
} from '@/features/work-orders/types/workOrder';
import { applyWorkOrderSupabaseFilters } from '@/features/work-orders/utils/workOrderSupabaseFilters';
import { buildWorkOrderStatusUpdatePayload } from '@/features/work-orders/utils/workOrderUpdatePayload';
import {
  WORK_ORDER_SELECT,
  mapWorkOrderRow,
} from '@/features/work-orders/services/workOrderRowMapper';
import {
  buildWorkOrderListSelect,
  requiresEquipmentInnerJoin,
  resolveWorkOrderTeamScope,
  withWorkOrderEquipmentInnerJoin,
} from '@/features/work-orders/services/workOrderListQueryHelpers';

// Re-export types for backward compatibility
export type {
  WorkOrder,
  WorkOrderCreateData,
};

/**
 * Filters for WorkOrderService.getAll()
 * Extends base FilterParams with work order specific filters
 */
export interface WorkOrderFilters extends FilterParams, WorkOrderServiceFilters {}

export class WorkOrderService extends BaseService {
  /**
   * Get all work orders for an organization with optional filters
   * Uses optimized single query with joins
   */
  async getAll(
    filters: WorkOrderFilters = {},
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<WorkOrder[]>> {
    try {
      const teamScope = resolveWorkOrderTeamScope(filters);

      if (teamScope.userTeams !== undefined && teamScope.userTeams.length === 0) {
        return this.handleSuccess([]);
      }

      const needsEquipmentInnerJoin = requiresEquipmentInnerJoin(teamScope);

      let query = supabase
        .from('work_orders')
        .select(buildWorkOrderListSelect(needsEquipmentInnerJoin))
        .eq('organization_id', this.organizationId);

      if (teamScope.userTeams && teamScope.userTeams.length > 0) {
        query = query.in('equipment.team_id', teamScope.userTeams);
      }

      if (teamScope.teamFilter) {
        query = query.eq('equipment.team_id', teamScope.teamFilter);
      }

      query = applyWorkOrderSupabaseFilters(query, filters, {
        overdueExcludeTerminalStatuses: true,
      });

      // Apply equipment filter (uses idx_work_orders_equipment_id index)
      if (filters.equipmentId) {
        query = query.eq('equipment_id', filters.equipmentId);
      }

      // Apply text search if provided
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply sorting
      if (pagination.sortBy) {
        query = query.order(pagination.sortBy, {
          ascending: pagination.sortOrder !== 'desc'
        });
      } else {
        query = query.order('created_date', { ascending: false });
      }

      query = applySupabasePaginationRange(query, pagination);

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching work orders:', error);
        return this.handleError(error);
      }

      const workOrders = (data || []).map(wo => mapWorkOrderRow(wo as unknown as Record<string, unknown>));
      return this.handleSuccess(workOrders);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get work order by ID with organization validation
   * Uses optimized query with joins
   */
  async getById(
    id: string,
    filters: { userTeamIds?: string[]; isOrgAdmin?: boolean } = {},
  ): Promise<ApiResponse<WorkOrder>> {
    try {
      const teamScope = resolveWorkOrderTeamScope(filters);

      if (teamScope.userTeams !== undefined && teamScope.userTeams.length === 0) {
        return this.handleError(new Error('Work order not found'));
      }

      const needsEquipmentInnerJoin = requiresEquipmentInnerJoin(teamScope);
      let query = supabase
        .from('work_orders')
        .select(
          needsEquipmentInnerJoin
            ? withWorkOrderEquipmentInnerJoin(WORK_ORDER_SELECT)
            : WORK_ORDER_SELECT,
        )
        .eq('id', id)
        .eq('organization_id', this.organizationId);

      if (teamScope.userTeams && teamScope.userTeams.length > 0) {
        query = query.in('equipment.team_id', teamScope.userTeams);
      }

      const { data, error } = await query.single();

      if (error) {
        logger.error('Error fetching work order by ID:', error);
        return this.handleError(error);
      }

      if (!data) {
        return this.handleError(new Error('Work order not found'));
      }

      return this.handleSuccess(mapWorkOrderRow(data as unknown as Record<string, unknown>));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create new work order
   */
  async create(data: WorkOrderCreateData): Promise<ApiResponse<WorkOrder>> {
    try {
      // Validate required fields
      if (!data.title || data.description == null || !data.equipment_id) {
        return this.handleError(new Error('Missing required fields: title, description, equipment_id'));
      }

      const { data: newWorkOrder, error } = await supabase
        .from('work_orders')
        .insert({
          organization_id: this.organizationId,
          title: data.title,
          description: data.description,
          equipment_id: data.equipment_id,
          priority: data.priority || 'medium',
          status: data.status || 'submitted',
          assignee_id: data.assignee_id || null,
          due_date: data.due_date || null,
          due_date_has_time: data.due_date_has_time ?? false,
          estimated_hours: data.estimated_hours || null,
          created_by: data.created_by,
          is_historical: data.is_historical || false,
          historical_start_date: data.historical_start_date || null,
          historical_notes: data.historical_notes || null,
          has_pm: data.has_pm || false,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating work order:', error);
        return this.handleError(error);
      }

      // Fetch the complete work order with joins
      return this.getById(newWorkOrder.id);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update work order status
   * @param id - Work order ID
   * @param status - New status
   * @param assigneeId - Optional assignee ID to set alongside status update
   */
  async updateStatus(id: string, status: WorkOrder['status'], assigneeId?: string | null): Promise<ApiResponse<WorkOrder>> {
    try {
      const updateData = buildWorkOrderStatusUpdatePayload(status, assigneeId);

      const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error updating work order status:', error);
        return this.handleError(error);
      }

      // Fetch the updated work order with joins to ensure we have all related data
      return this.getById(id);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete work order
   */
  async delete(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id)
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error deleting work order:', error);
        return this.handleError(error);
      }

      return this.handleSuccess(true);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
