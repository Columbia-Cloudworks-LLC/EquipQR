import { BaseService, ApiResponse, PaginationParams, FilterParams } from './base/BaseService';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

// Use Supabase types for WorkOrder with computed fields
export type WorkOrderRow = Tables<'work_orders'>;

export interface WorkOrder extends WorkOrderRow {
  // Computed fields from joins
  assigneeName?: string;
  teamName?: string;
  equipmentName?: string;
  equipmentTeamId?: string;
  equipmentTeamName?: string;
  createdByName?: string;
}

export interface WorkOrderFilters extends FilterParams {
  status?: WorkOrder['status'] | 'all';
  priority?: WorkOrder['priority'] | 'all';
  assigneeId?: string | 'unassigned' | 'all';
  teamId?: string | 'all';
  equipmentId?: string;
  dueDateFilter?: 'overdue' | 'today' | 'this_week';
  search?: string;
  // Team-based access control
  userTeamIds?: string[];
  isOrgAdmin?: boolean;
}

export interface WorkOrderCreateData {
  title: string;
  description: string;
  equipment_id: string;
  priority: WorkOrder['priority'];
  status?: WorkOrder['status'];
  assignee_id?: string;
  team_id?: string;
  due_date?: string;
  estimated_hours?: number;
  created_by: string;
  is_historical?: boolean;
  historical_start_date?: string;
  historical_notes?: string;
}

export interface WorkOrderUpdateData {
  title?: string;
  description?: string;
  equipment_id?: string;
  priority?: WorkOrder['priority'];
  status?: WorkOrder['status'];
  assignee_id?: string | null;
  team_id?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  completed_date?: string | null;
}

// Optimized select query string with all joins
const WORK_ORDER_SELECT = `
  *,
  assignee:profiles!work_orders_assignee_id_fkey (
    id,
    name
  ),
  equipment:equipment!work_orders_equipment_id_fkey (
    id,
    name,
    team_id,
    teams:team_id (
      id,
      name
    )
  ),
  creator:profiles!work_orders_created_by_fkey (
    id,
    name
  )
`;

/**
 * Maps raw Supabase row to WorkOrder with computed fields
 */
function mapWorkOrderRow(wo: Record<string, unknown>): WorkOrder {
  const assignee = wo.assignee as { id?: string; name?: string } | null;
  const equipment = wo.equipment as { 
    id?: string; 
    name?: string; 
    team_id?: string; 
    teams?: { id?: string; name?: string } | null 
  } | null;
  const creator = wo.creator as { id?: string; name?: string } | null;

  return {
    // Base work order fields
    id: wo.id as string,
    title: wo.title as string,
    description: wo.description as string,
    equipment_id: wo.equipment_id as string,
    organization_id: wo.organization_id as string,
    priority: wo.priority as WorkOrder['priority'],
    status: wo.status as WorkOrder['status'],
    assignee_id: wo.assignee_id as string | null,
    assignee_name: wo.assignee_name as string | null,
    team_id: wo.team_id as string | null,
    created_by: wo.created_by as string,
    created_by_admin: wo.created_by_admin as string | null,
    created_by_name: wo.created_by_name as string | null,
    created_date: wo.created_date as string,
    due_date: wo.due_date as string | null,
    estimated_hours: wo.estimated_hours as number | null,
    completed_date: wo.completed_date as string | null,
    acceptance_date: wo.acceptance_date as string | null,
    updated_at: wo.updated_at as string,
    is_historical: wo.is_historical as boolean,
    historical_start_date: wo.historical_start_date as string | null,
    historical_notes: wo.historical_notes as string | null,
    has_pm: wo.has_pm as boolean,
    pm_required: wo.pm_required as boolean,
    // Computed fields from joins
    assigneeName: assignee?.name || undefined,
    teamName: equipment?.teams?.name || undefined,
    equipmentName: equipment?.name || undefined,
    equipmentTeamId: equipment?.team_id || undefined,
    equipmentTeamName: equipment?.teams?.name || undefined,
    createdByName: creator?.name || undefined,
  };
}

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
      let query = supabase
        .from('work_orders')
        .select(WORK_ORDER_SELECT)
        .eq('organization_id', this.organizationId);

      // Apply team-based access control filtering
      if (filters.userTeamIds !== undefined && !filters.isOrgAdmin) {
        if (filters.userTeamIds.length > 0) {
          // Get equipment IDs for user's teams
          const { data: equipmentIds } = await supabase
            .from('equipment')
            .select('id')
            .eq('organization_id', this.organizationId)
            .in('team_id', filters.userTeamIds);

          const ids = equipmentIds?.map(e => e.id) || [];
          if (ids.length > 0) {
            query = query.in('equipment_id', ids);
          } else {
            // No equipment for user's teams, return empty
            return this.handleSuccess([]);
          }
        } else {
          // User has no team memberships
          return this.handleSuccess([]);
        }
      }

      // Apply status filter (uses idx_work_orders_org_status composite index)
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply priority filter
      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      // Apply assignee filter (uses idx_work_orders_assignee_id index)
      if (filters.assigneeId && filters.assigneeId !== 'all') {
        if (filters.assigneeId === 'unassigned') {
          query = query.is('assignee_id', null);
        } else {
          query = query.eq('assignee_id', filters.assigneeId);
        }
      }

      // Apply team filter - requires getting equipment IDs first
      if (filters.teamId && filters.teamId !== 'all') {
        const { data: equipmentIds } = await supabase
          .from('equipment')
          .select('id')
          .eq('organization_id', this.organizationId)
          .eq('team_id', filters.teamId);

        const ids = equipmentIds?.map(e => e.id) || [];
        if (ids.length > 0) {
          query = query.in('equipment_id', ids);
        } else {
          // No equipment for this team
          return this.handleSuccess([]);
        }
      }

      // Apply equipment filter (uses idx_work_orders_equipment_id index)
      if (filters.equipmentId) {
        query = query.eq('equipment_id', filters.equipmentId);
      }

      // Apply due date filter (uses idx_work_orders_org_due_date)
      if (filters.dueDateFilter) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        switch (filters.dueDateFilter) {
          case 'overdue':
            query = query
              .lt('due_date', today.toISOString())
              .not('status', 'eq', 'completed')
              .not('status', 'eq', 'cancelled');
            break;
          case 'today': {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', tomorrow.toISOString());
            break;
          }
          case 'this_week':
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', weekFromNow.toISOString());
            break;
        }
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

      // Apply pagination
      if (pagination.limit) {
        const startIndex = ((pagination.page || 1) - 1) * pagination.limit;
        query = query.range(startIndex, startIndex + pagination.limit - 1);
      }

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
  async getById(id: string): Promise<ApiResponse<WorkOrder>> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(WORK_ORDER_SELECT)
        .eq('id', id)
        .eq('organization_id', this.organizationId)
        .single();

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
      if (!data.title || !data.description || !data.equipment_id) {
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
          team_id: data.team_id || null,
          due_date: data.due_date || null,
          estimated_hours: data.estimated_hours || null,
          created_by: data.created_by,
          is_historical: data.is_historical || false,
          historical_start_date: data.historical_start_date || null,
          historical_notes: data.historical_notes || null,
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
   * Update work order
   */
  async update(id: string, data: WorkOrderUpdateData): Promise<ApiResponse<WorkOrder>> {
    try {
      // Build update object with only provided fields
      const updateData: Partial<WorkOrderRow> = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.equipment_id !== undefined) updateData.equipment_id = data.equipment_id;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.assignee_id !== undefined) updateData.assignee_id = data.assignee_id;
      if (data.team_id !== undefined) updateData.team_id = data.team_id;
      if (data.due_date !== undefined) updateData.due_date = data.due_date;
      if (data.estimated_hours !== undefined) updateData.estimated_hours = data.estimated_hours;
      if (data.completed_date !== undefined) updateData.completed_date = data.completed_date;

      const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error updating work order:', error);
        return this.handleError(error);
      }

      // Fetch the updated work order with joins
      return this.getById(id);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update work order status
   */
  async updateStatus(id: string, status: WorkOrder['status']): Promise<ApiResponse<WorkOrder>> {
    try {
      const updateData: Partial<WorkOrderRow> = { status };

      // Set completed_date if transitioning to completed
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      // Set acceptance_date if transitioning to accepted
      if (status === 'accepted') {
        updateData.acceptance_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error updating work order status:', error);
        return this.handleError(error);
      }

      // Fetch the updated work order with joins
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

  /**
   * Get status counts for work orders
   */
  async getStatusCounts(): Promise<ApiResponse<Record<WorkOrder['status'], number>>> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('status')
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error fetching work order status counts:', error);
        return this.handleError(error);
      }

      const counts = (data || []).reduce((acc, wo) => {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
      }, {} as Record<WorkOrder['status'], number>);

      // Ensure all statuses are present
      const allStatuses: WorkOrder['status'][] = [
        'submitted', 'accepted', 'assigned', 'in_progress', 
        'on_hold', 'completed', 'cancelled'
      ];
      allStatuses.forEach(status => {
        if (!(status in counts)) {
          counts[status] = 0;
        }
      });

      return this.handleSuccess(counts);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get priority distribution for work orders
   */
  async getPriorityDistribution(): Promise<ApiResponse<Record<WorkOrder['priority'], number>>> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('priority')
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error fetching work order priority distribution:', error);
        return this.handleError(error);
      }

      const distribution = (data || []).reduce((acc, wo) => {
        acc[wo.priority] = (acc[wo.priority] || 0) + 1;
        return acc;
      }, {} as Record<WorkOrder['priority'], number>);

      // Ensure all priorities are present
      const allPriorities: WorkOrder['priority'][] = ['low', 'medium', 'high'];
      allPriorities.forEach(priority => {
        if (!(priority in distribution)) {
          distribution[priority] = 0;
        }
      });

      return this.handleSuccess(distribution);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get dashboard stats for work orders
   */
  async getDashboardStats(): Promise<ApiResponse<{
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('status, due_date')
        .eq('organization_id', this.organizationId);

      if (error) {
        logger.error('Error fetching work order dashboard stats:', error);
        return this.handleError(error);
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const workOrders = data || [];

      const total = workOrders.length;
      const completed = workOrders.filter(wo => wo.status === 'completed').length;
      const pending = workOrders.filter(wo => 
        !['completed', 'cancelled'].includes(wo.status)
      ).length;
      const overdue = workOrders.filter(wo => 
        wo.due_date && 
        new Date(wo.due_date) < today && 
        !['completed', 'cancelled'].includes(wo.status)
      ).length;

      return this.handleSuccess({ total, completed, pending, overdue });
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================
  // Convenience methods (previously in optimizedWorkOrderService.ts)
  // ============================================

  /**
   * Get work orders assigned to a specific user
   */
  async getMyWorkOrders(userId: string): Promise<ApiResponse<WorkOrder[]>> {
    return this.getAll({ assigneeId: userId });
  }

  /**
   * Get work orders for a specific team
   */
  async getTeamWorkOrders(
    teamId: string,
    status?: WorkOrder['status'] | 'all'
  ): Promise<ApiResponse<WorkOrder[]>> {
    return this.getAll({ teamId, status });
  }

  /**
   * Get work orders for specific equipment
   */
  async getEquipmentWorkOrders(
    equipmentId: string,
    status?: WorkOrder['status'] | 'all'
  ): Promise<ApiResponse<WorkOrder[]>> {
    return this.getAll({ equipmentId, status });
  }

  /**
   * Get overdue work orders
   */
  async getOverdueWorkOrders(): Promise<ApiResponse<WorkOrder[]>> {
    return this.getAll({ dueDateFilter: 'overdue' });
  }

  /**
   * Get work orders due today
   */
  async getWorkOrdersDueToday(): Promise<ApiResponse<WorkOrder[]>> {
    return this.getAll({ dueDateFilter: 'today' });
  }
}
