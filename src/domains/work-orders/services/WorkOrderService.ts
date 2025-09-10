/**
 * Consolidated Work Order Service
 * Merges workOrderDataService.ts and optimizedWorkOrderService.ts
 * Follows SOLID principles with dependency injection and single responsibility
 */

import { BaseService } from '@/shared/base/BaseService';
import { BaseRepository } from '@/shared/base/BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import { 
  WorkOrder, 
  EnhancedWorkOrder,
  CreateWorkOrderData, 
  UpdateWorkOrderData,
  WorkOrderFilters,
  WorkOrderStats,
  WorkOrderAssignmentData,
  WorkOrderAcceptanceData,
  WorkOrderStatusUpdateData,
  WorkOrderBulkUpdateData
} from '../types/WorkOrder';
import { ApiResponse, FilterParams, PaginationParams, QueryOptions } from '@/shared/types/common';
import { WORK_ORDERS } from '@/shared/constants';

/**
 * Work Order Repository
 */
class WorkOrderRepository extends BaseRepository<WorkOrder, CreateWorkOrderData, UpdateWorkOrderData> {
  protected tableName = WORK_ORDERS;

  constructor() {
    super(supabase);
  }

  /**
   * Get work orders with enhanced data (equipment, assignee, creator, team)
   */
  async getEnhancedWorkOrders(filters: FilterParams, pagination?: PaginationParams): Promise<EnhancedWorkOrder[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        id,
        title,
        description,
        equipment_id,
        organization_id,
        priority,
        status,
        assignee_id,
        team_id,
        created_date,
        due_date,
        estimated_hours,
        completed_date,
        created_by,
        is_historical,
        pm_template_id,
        pm_checklist_id,
        equipment:equipment_id (
          id,
          name,
          team_id,
          teams:team_id (
            name
          )
        ),
        assignee:profiles!work_orders_assignee_id_fkey (
          id,
          name
        ),
        creator:profiles!work_orders_created_by_fkey (
          id,
          name
        ),
        team:teams!work_orders_team_id_fkey (
          id,
          name
        )
      `)
      .match(filters)
      .order('created_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(wo => ({
      ...wo,
      assignee_name: wo.assignee?.name,
      team_name: wo.team?.name,
      equipment_name: wo.equipment?.name,
      days_overdue: wo.due_date ? this.calculateDaysOverdue(wo.due_date) : undefined,
      is_overdue: wo.due_date ? this.isOverdue(wo.due_date) : false
    }));
  }

  /**
   * Get work orders by assignee
   */
  async getWorkOrdersByAssignee(organizationId: string, assigneeId: string, status?: string): Promise<EnhancedWorkOrder[]> {
    const filters: FilterParams = {
      organization_id: organizationId,
      assignee_id: assigneeId
    };

    if (status && status !== 'all') {
      filters.status = status;
    }

    return this.getEnhancedWorkOrders(filters);
  }

  /**
   * Get work orders by team
   */
  async getWorkOrdersByTeam(organizationId: string, teamId: string, status?: string): Promise<EnhancedWorkOrder[]> {
    const filters: FilterParams = {
      organization_id: organizationId,
      team_id: teamId
    };

    if (status && status !== 'all') {
      filters.status = status;
    }

    return this.getEnhancedWorkOrders(filters);
  }

  /**
   * Get work orders by equipment
   */
  async getWorkOrdersByEquipment(organizationId: string, equipmentId: string): Promise<EnhancedWorkOrder[]> {
    const filters: FilterParams = {
      organization_id: organizationId,
      equipment_id: equipmentId
    };

    return this.getEnhancedWorkOrders(filters);
  }

  /**
   * Get overdue work orders
   */
  async getOverdueWorkOrders(organizationId: string): Promise<EnhancedWorkOrder[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        equipment:equipment_id (name),
        assignee:profiles!work_orders_assignee_id_fkey (name),
        creator:profiles!work_orders_created_by_fkey (name),
        team:teams!work_orders_team_id_fkey (name)
      `)
      .eq('organization_id', organizationId)
      .lt('due_date', today)
      .in('status', ['submitted', 'accepted', 'assigned', 'in_progress'])
      .order('due_date', { ascending: true });

    if (error) throw error;

    return (data || []).map(wo => ({
      ...wo,
      assignee_name: wo.assignee?.name,
      team_name: wo.team?.name,
      equipment_name: wo.equipment?.name,
      days_overdue: wo.due_date ? this.calculateDaysOverdue(wo.due_date) : 0,
      is_overdue: true
    }));
  }

  /**
   * Get work orders due today
   */
  async getWorkOrdersDueToday(organizationId: string): Promise<EnhancedWorkOrder[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        equipment:equipment_id (name),
        assignee:profiles!work_orders_assignee_id_fkey (name),
        creator:profiles!work_orders_created_by_fkey (name),
        team:teams!work_orders_team_id_fkey (name)
      `)
      .eq('organization_id', organizationId)
      .eq('due_date', today)
      .in('status', ['submitted', 'accepted', 'assigned', 'in_progress'])
      .order('priority', { ascending: false });

    if (error) throw error;

    return (data || []).map(wo => ({
      ...wo,
      assignee_name: wo.assignee?.name,
      team_name: wo.team?.name,
      equipment_name: wo.equipment?.name,
      days_overdue: 0,
      is_overdue: false
    }));
  }

  /**
   * Search work orders
   */
  async searchWorkOrders(organizationId: string, searchTerm: string): Promise<EnhancedWorkOrder[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        equipment:equipment_id (name),
        assignee:profiles!work_orders_assignee_id_fkey (name),
        creator:profiles!work_orders_created_by_fkey (name),
        team:teams!work_orders_team_id_fkey (name)
      `)
      .eq('organization_id', organizationId)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(wo => ({
      ...wo,
      assignee_name: wo.assignee?.name,
      team_name: wo.team?.name,
      equipment_name: wo.equipment?.name,
      days_overdue: wo.due_date ? this.calculateDaysOverdue(wo.due_date) : undefined,
      is_overdue: wo.due_date ? this.isOverdue(wo.due_date) : false
    }));
  }

  /**
   * Get work order statistics
   */
  async getWorkOrderStats(organizationId: string): Promise<WorkOrderStats> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('status, priority, due_date, estimated_hours, completed_date, created_date')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const workOrders = data || [];
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const stats = workOrders.reduce((acc, wo) => {
      acc.total += 1;
      acc.by_status[wo.status] = (acc.by_status[wo.status] || 0) + 1;
      acc.by_priority[wo.priority] = (acc.by_priority[wo.priority] || 0) + 1;
      
      if (wo.due_date && wo.due_date < today && ['submitted', 'accepted', 'assigned', 'in_progress'].includes(wo.status)) {
        acc.overdue_count += 1;
      }
      
      if (wo.status === 'completed' && wo.completed_date && wo.completed_date >= oneWeekAgo) {
        acc.completed_this_week += 1;
      }
      
      if (wo.estimated_hours) {
        acc.total_estimated_hours += wo.estimated_hours;
      }
      
      if (wo.status === 'completed' && wo.completed_date && wo.created_date) {
        const created = new Date(wo.created_date);
        const completed = new Date(wo.completed_date);
        const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
        acc.total_actual_hours += hours;
      }
      
      return acc;
    }, {
      total: 0,
      by_status: {} as Record<string, number>,
      by_priority: {} as Record<string, number>,
      overdue_count: 0,
      completed_this_week: 0,
      avg_completion_time_hours: 0,
      total_estimated_hours: 0,
      total_actual_hours: 0
    });

    // Calculate average completion time
    const completedCount = stats.by_status.completed || 0;
    stats.avg_completion_time_hours = completedCount > 0 ? stats.total_actual_hours / completedCount : 0;

    return stats;
  }

  /**
   * Calculate days overdue
   */
  private calculateDaysOverdue(dueDate: string): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if work order is overdue
   */
  private isOverdue(dueDate: string): boolean {
    return this.calculateDaysOverdue(dueDate) > 0;
  }
}

/**
 * Work Order Service
 */
export class WorkOrderService extends BaseService {
  private repository: WorkOrderRepository;

  constructor(organizationId: string) {
    super(organizationId);
    this.repository = new WorkOrderRepository();
  }

  /**
   * Get filtered work orders
   */
  async getFilteredWorkOrders(filters: WorkOrderFilters = {}): Promise<ApiResponse<EnhancedWorkOrder[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getFilteredWorkOrders', { filters });
      const startTime = Date.now();

      const queryFilters: FilterParams = {
        ...this.getOrganizationContext()
      };

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        queryFilters.status = filters.status;
      }
      if (filters.assigneeId) {
        queryFilters.assignee_id = filters.assigneeId;
      }
      if (filters.teamId) {
        queryFilters.team_id = filters.teamId;
      }
      if (filters.priority && filters.priority !== 'all') {
        queryFilters.priority = filters.priority;
      }
      if (filters.equipmentId) {
        queryFilters.equipment_id = filters.equipmentId;
      }
      if (filters.isHistorical !== undefined) {
        queryFilters.is_historical = filters.isHistorical;
      }
      if (filters.pmTemplateId) {
        queryFilters.pm_template_id = filters.pmTemplateId;
      }
      if (filters.createdBy) {
        queryFilters.created_by = filters.createdBy;
      }

      // Handle date range
      if (filters.dateRange) {
        queryFilters.created_date = {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end
        };
      }

      // Handle due date filters
      if (filters.dueDateFilter) {
        const today = new Date().toISOString().split('T')[0];
        switch (filters.dueDateFilter) {
          case 'overdue':
            queryFilters.due_date = { lt: today };
            queryFilters.status = ['submitted', 'accepted', 'assigned', 'in_progress'];
            break;
          case 'today':
            queryFilters.due_date = today;
            break;
          case 'this_week':
            const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            queryFilters.due_date = { gte: today, lte: weekEnd };
            break;
        }
      }

      const workOrders = await this.repository.getEnhancedWorkOrders(queryFilters);
      
      // Apply search filter
      let filteredWorkOrders = workOrders;
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredWorkOrders = workOrders.filter(wo => 
          wo.title.toLowerCase().includes(searchTerm) ||
          wo.description.toLowerCase().includes(searchTerm) ||
          wo.equipment_name?.toLowerCase().includes(searchTerm) ||
          wo.assignee_name?.toLowerCase().includes(searchTerm)
        );
      }
      
      this.logOperationComplete('getFilteredWorkOrders', Date.now() - startTime, { 
        filters, 
        count: filteredWorkOrders.length 
      });
      return filteredWorkOrders;
    }, 'get filtered work orders');
  }

  /**
   * Get work orders by assignee
   */
  async getMyWorkOrders(userId: string): Promise<ApiResponse<EnhancedWorkOrder[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getMyWorkOrders', { userId });
      const startTime = Date.now();

      const workOrders = await this.repository.getWorkOrdersByAssignee(this.organizationId, userId);
      
      this.logOperationComplete('getMyWorkOrders', Date.now() - startTime, { userId, count: workOrders.length });
      return workOrders;
    }, 'get my work orders');
  }

  /**
   * Get work orders by team
   */
  async getTeamWorkOrders(teamId: string, status?: string): Promise<ApiResponse<EnhancedWorkOrder[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getTeamWorkOrders', { teamId, status });
      const startTime = Date.now();

      const workOrders = await this.repository.getWorkOrdersByTeam(this.organizationId, teamId, status);
      
      this.logOperationComplete('getTeamWorkOrders', Date.now() - startTime, { teamId, status, count: workOrders.length });
      return workOrders;
    }, 'get team work orders');
  }

  /**
   * Get work orders by equipment
   */
  async getEquipmentWorkOrders(equipmentId: string): Promise<ApiResponse<EnhancedWorkOrder[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getEquipmentWorkOrders', { equipmentId });
      const startTime = Date.now();

      const workOrders = await this.repository.getWorkOrdersByEquipment(this.organizationId, equipmentId);
      
      this.logOperationComplete('getEquipmentWorkOrders', Date.now() - startTime, { equipmentId, count: workOrders.length });
      return workOrders;
    }, 'get equipment work orders');
  }

  /**
   * Get overdue work orders
   */
  async getOverdueWorkOrders(): Promise<ApiResponse<EnhancedWorkOrder[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getOverdueWorkOrders');
      const startTime = Date.now();

      const workOrders = await this.repository.getOverdueWorkOrders(this.organizationId);
      
      this.logOperationComplete('getOverdueWorkOrders', Date.now() - startTime, { count: workOrders.length });
      return workOrders;
    }, 'get overdue work orders');
  }

  /**
   * Get work orders due today
   */
  async getWorkOrdersDueToday(): Promise<ApiResponse<EnhancedWorkOrder[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getWorkOrdersDueToday');
      const startTime = Date.now();

      const workOrders = await this.repository.getWorkOrdersDueToday(this.organizationId);
      
      this.logOperationComplete('getWorkOrdersDueToday', Date.now() - startTime, { count: workOrders.length });
      return workOrders;
    }, 'get work orders due today');
  }

  /**
   * Search work orders
   */
  async searchWorkOrders(searchTerm: string): Promise<ApiResponse<EnhancedWorkOrder[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('searchWorkOrders', { searchTerm });
      const startTime = Date.now();

      const workOrders = await this.repository.searchWorkOrders(this.organizationId, searchTerm);
      
      this.logOperationComplete('searchWorkOrders', Date.now() - startTime, { searchTerm, count: workOrders.length });
      return workOrders;
    }, 'search work orders');
  }

  /**
   * Get work order statistics
   */
  async getWorkOrderStats(): Promise<ApiResponse<WorkOrderStats>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getWorkOrderStats');
      const startTime = Date.now();

      const stats = await this.repository.getWorkOrderStats(this.organizationId);
      
      this.logOperationComplete('getWorkOrderStats', Date.now() - startTime);
      return stats;
    }, 'get work order statistics');
  }

  /**
   * Create work order
   */
  async createWorkOrder(data: CreateWorkOrderData): Promise<ApiResponse<WorkOrder>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('createWorkOrder', { title: data.title });
      const startTime = Date.now();

      // Validate required fields
      const requiredFields = ['title', 'description', 'equipment_id', 'priority'];
      const missingFields = this.validateRequiredFields(data, requiredFields);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const workOrderData = {
        ...data,
        ...this.getOrganizationContext()
      };

      const workOrder = await this.repository.create(workOrderData);
      
      this.logOperationComplete('createWorkOrder', Date.now() - startTime, { workOrderId: workOrder.id });
      return workOrder;
    }, 'create work order');
  }

  /**
   * Update work order
   */
  async updateWorkOrder(workOrderId: string, data: UpdateWorkOrderData): Promise<ApiResponse<WorkOrder>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('updateWorkOrder', { workOrderId });
      const startTime = Date.now();

      const workOrder = await this.repository.update(workOrderId, data);
      
      this.logOperationComplete('updateWorkOrder', Date.now() - startTime, { workOrderId });
      return workOrder;
    }, 'update work order');
  }

  /**
   * Delete work order
   */
  async deleteWorkOrder(workOrderId: string): Promise<ApiResponse<void>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('deleteWorkOrder', { workOrderId });
      const startTime = Date.now();

      await this.repository.delete(workOrderId);
      
      this.logOperationComplete('deleteWorkOrder', Date.now() - startTime, { workOrderId });
    }, 'delete work order');
  }
}

// Export singleton instance factory
export const createWorkOrderService = (organizationId: string) => new WorkOrderService(organizationId);
