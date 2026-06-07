// fallow-ignore-file code-duplication
// Duplication rationale: Service repeats org-scoped equipment resolution for filters
import { BaseService, ApiResponse, PaginationParams, FilterParams } from '@/services/base/BaseService';
import { applySupabasePaginationRange } from '@/services/supabaseQueryPagination';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Import and re-export unified types from the single source of truth
import {
  WorkOrder,
  WorkOrderRow,
  WorkOrderCreateData,
  WorkOrderUpdateData,
  WorkOrderNote,
  WorkOrderNoteCreateData,
  WorkOrderImage,
  WorkOrderServiceFilters,
} from '@/features/work-orders/types/workOrder';
import { applyWorkOrderSupabaseFilters } from '@/features/work-orders/utils/workOrderSupabaseFilters';
import {
  WORK_ORDER_SELECT,
  WORK_ORDER_LIST_SELECT,
  mapWorkOrderRow,
} from '@/features/work-orders/services/workOrderRowMapper';
import {
  resolveEquipmentIdsForTeamFilter,
  resolveEquipmentIdsForUserTeams,
} from '@/features/work-orders/services/workOrderListQueryHelpers';
import {
  createWorkOrderNoteWithImages,
  getWorkOrderNotesWithImages,
} from '@/features/work-orders/services/workOrderNotesService';
import {
  fetchWorkOrderImagesForService,
  uploadWorkOrderImageForService,
} from '@/features/work-orders/services/workOrderServiceImages';
import { fetchWorkOrderInOrganization } from '@/features/work-orders/services/workOrderServiceAccess';

// Re-export types for backward compatibility
export type {
  WorkOrder,
  WorkOrderCreateData,
  WorkOrderUpdateData,
  WorkOrderNote,
  WorkOrderNoteCreateData,
  WorkOrderImage,
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
      let query = supabase
        .from('work_orders')
        .select(WORK_ORDER_LIST_SELECT)
        .eq('organization_id', this.organizationId);

      // Apply team-based access control filtering
      if (filters.userTeamIds !== undefined && !filters.isOrgAdmin) {
        if (filters.userTeamIds.length > 0) {
          const equipmentResolution = await resolveEquipmentIdsForUserTeams(
            this.organizationId,
            filters.userTeamIds,
          );

          if (equipmentResolution === 'empty') {
            return this.handleSuccess([]);
          }

          query = query.in('equipment_id', equipmentResolution);
        } else {
          return this.handleSuccess([]);
        }
      }

      query = applyWorkOrderSupabaseFilters(query, filters, {
        overdueExcludeTerminalStatuses: true,
      });

      // Apply team filter - requires getting equipment IDs first
      if (filters.teamId && filters.teamId !== 'all') {
        const equipmentResolution = await resolveEquipmentIdsForTeamFilter(
          this.organizationId,
          filters.teamId,
        );

        if (equipmentResolution === 'empty') {
          return this.handleSuccess([]);
        }

        query = query.in('equipment_id', equipmentResolution);
      }

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
   * @param id - Work order ID
   * @param status - New status
   * @param assigneeId - Optional assignee ID to set alongside status update
   */
  async updateStatus(id: string, status: WorkOrder['status'], assigneeId?: string | null): Promise<ApiResponse<WorkOrder>> {
    try {
      const updateData: Partial<WorkOrderRow> = { 
        status,
        updated_at: new Date().toISOString()
      };

      // Set assignee_id if provided (undefined = don't change; null = unassign; string = assign)
      if (assigneeId !== undefined) {
        updateData.assignee_id = assigneeId;
      }

      // Set completed_date if transitioning to completed
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      // Set acceptance_date when transitioning to accepted, assigned, or in_progress with a
      // valid assignee. The in_progress case covers the "Assign & Start" flow where a work order
      // skips the 'assigned' state and goes directly from 'accepted' to 'in_progress' with an
      // assigneeId — without this, acceptance_date would remain null.
      const hasValidAssignee = assigneeId != null && assigneeId !== '';
      if (status === 'accepted' || ((status === 'assigned' || status === 'in_progress') && hasValidAssignee)) {
        updateData.acceptance_date = new Date().toISOString();
      }

      // Clear completed_date when reopening
      if (status === 'submitted' || status === 'accepted' || status === 'assigned' || status === 'in_progress') {
        updateData.completed_date = null;
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

  // ============================================
  // Convenience methods
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

  // ============================================
  // Work Order Notes Methods
  // ============================================

  /**
   * Get notes for a work order with author names and associated images
   */
  async getNotes(workOrderId: string): Promise<ApiResponse<WorkOrderNote[]>> {
    try {
      const workOrder = await fetchWorkOrderInOrganization(this.organizationId, workOrderId);
      if (!workOrder) {
        return this.handleError(new Error('Work order not found'));
      }

      const notes = await getWorkOrderNotesWithImages(workOrderId, this.organizationId);
      return this.handleSuccess(notes as unknown as WorkOrderNote[]);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a note for a work order
   */
  async createNote(
    workOrderId: string,
    noteData: WorkOrderNoteCreateData
  ): Promise<ApiResponse<WorkOrderNote>> {
    try {
      const note = await createWorkOrderNoteWithImages(
        workOrderId,
        noteData.content,
        noteData.hours_worked || 0,
        noteData.is_private || false,
        [],
        this.organizationId,
      );

      return this.handleSuccess(note as unknown as WorkOrderNote);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================
  // Work Order Images Methods
  // ============================================

  /**
   * Get all images for a work order
   */
  async getImages(workOrderId: string): Promise<ApiResponse<WorkOrderImage[]>> {
    try {
      const images = await fetchWorkOrderImagesForService(this.organizationId, workOrderId);
      return this.handleSuccess(images);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Upload an image for a work order
   */
  async uploadImage(
    workOrderId: string,
    file: File,
    description?: string
  ): Promise<ApiResponse<WorkOrderImage>> {
    try {
      const image = await uploadWorkOrderImageForService(
        this.organizationId,
        workOrderId,
        file,
        description,
      );
      return this.handleSuccess(image);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
