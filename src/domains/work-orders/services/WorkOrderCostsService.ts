/**
 * Consolidated Work Order Costs Service
 * Merges workOrderCostsService.ts and workOrderCostsOptimizedService.ts
 * Follows SOLID principles with dependency injection and single responsibility
 */

import { BaseService } from '@/shared/base/BaseService';
import { BaseRepository } from '@/shared/base/BaseRepository';
import { supabase } from '@/integrations/supabase/client';
import { 
  WorkOrderCost, 
  CreateWorkOrderCostData, 
  UpdateWorkOrderCostData,
  WorkOrderCostSummary,
  WorkOrderCostFilters,
  WorkOrderCostBulkUpdateData
} from '../types/WorkOrderCosts';
import { ApiResponse, FilterParams, PaginationParams } from '@/shared/types/common';
import { WORK_ORDER_COSTS } from '@/shared/constants';

/**
 * Work Order Costs Repository
 */
class WorkOrderCostsRepository extends BaseRepository<WorkOrderCost, CreateWorkOrderCostData, UpdateWorkOrderCostData> {
  protected tableName = WORK_ORDER_COSTS;

  constructor() {
    super(supabase);
  }

  /**
   * Get costs by work order with creator names
   */
  async getCostsByWorkOrder(workOrderId: string): Promise<WorkOrderCost[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Get creator names
    const costs = data || [];
    const creatorIds = [...new Set(costs.map(cost => cost.created_by))];
    
    let profilesMap: Record<string, string> = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, name')
        .in('id', creatorIds);

      profilesMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile.name;
        return acc;
      }, {} as Record<string, string>);
    }

    return costs.map(cost => ({
      ...cost,
      created_by_name: profilesMap[cost.created_by],
      unit_price_dollars: cost.unit_price_cents / 100,
      total_price_dollars: cost.total_price_cents / 100
    }));
  }

  /**
   * Get costs by creator with work order details
   */
  async getCostsByCreator(organizationId: string, userId: string): Promise<WorkOrderCost[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        work_orders!inner (
          id,
          title,
          organization_id
        )
      `)
      .eq('created_by', userId)
      .eq('work_orders.organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(cost => ({
      ...cost,
      unit_price_dollars: cost.unit_price_cents / 100,
      total_price_dollars: cost.total_price_cents / 100
    }));
  }

  /**
   * Get cost summary for a work order
   */
  async getCostSummary(workOrderId: string): Promise<WorkOrderCostSummary> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('work_order_id', workOrderId);

    if (error) throw error;

    const costs = data || [];
    const totalCostCents = costs.reduce((sum, cost) => sum + cost.total_price_cents, 0);
    const totalItems = costs.length;

    // Group by creator
    const byCreator = costs.reduce((acc, cost) => {
      const creatorId = cost.created_by;
      if (!acc[creatorId]) {
        acc[creatorId] = {
          creator_id: creatorId,
          creator_name: cost.created_by_name || 'Unknown',
          item_count: 0,
          total_cost_cents: 0
        };
      }
      acc[creatorId].item_count += 1;
      acc[creatorId].total_cost_cents += cost.total_price_cents;
      return acc;
    }, {} as Record<string, any>);

    return {
      total_items: totalItems,
      total_cost_cents: totalCostCents,
      total_cost_dollars: totalCostCents / 100,
      average_item_cost_cents: totalItems > 0 ? totalCostCents / totalItems : 0,
      average_item_cost_dollars: totalItems > 0 ? (totalCostCents / 100) / totalItems : 0,
      by_creator: Object.values(byCreator)
    };
  }
}

/**
 * Work Order Costs Service
 */
export class WorkOrderCostsService extends BaseService {
  private repository: WorkOrderCostsRepository;

  constructor(organizationId: string) {
    super(organizationId);
    this.repository = new WorkOrderCostsRepository();
  }

  /**
   * Get all costs for a work order
   */
  async getWorkOrderCosts(workOrderId: string): Promise<ApiResponse<WorkOrderCost[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getWorkOrderCosts', { workOrderId });
      const startTime = Date.now();

      const costs = await this.repository.getCostsByWorkOrder(workOrderId);
      
      this.logOperationComplete('getWorkOrderCosts', Date.now() - startTime, { workOrderId, count: costs.length });
      return costs;
    }, 'get work order costs');
  }

  /**
   * Get costs created by a specific user
   */
  async getMyCosts(userId: string): Promise<ApiResponse<WorkOrderCost[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getMyCosts', { userId });
      const startTime = Date.now();

      const costs = await this.repository.getCostsByCreator(this.organizationId, userId);
      
      this.logOperationComplete('getMyCosts', Date.now() - startTime, { userId, count: costs.length });
      return costs;
    }, 'get my costs');
  }

  /**
   * Create a new cost item
   */
  async createWorkOrderCost(data: CreateWorkOrderCostData): Promise<ApiResponse<WorkOrderCost>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('createWorkOrderCost', { workOrderId: data.work_order_id });
      const startTime = Date.now();

      // Validate required fields
      const requiredFields = ['work_order_id', 'description', 'quantity', 'unit_price_cents'];
      const missingFields = this.validateRequiredFields(data, requiredFields);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Calculate total price
      const totalPriceCents = data.quantity * data.unit_price_cents;
      const costData = {
        ...data,
        total_price_cents: totalPriceCents,
        ...this.getOrganizationContext()
      };

      const cost = await this.repository.create(costData);
      
      this.logOperationComplete('createWorkOrderCost', Date.now() - startTime, { workOrderId: data.work_order_id });
      return cost;
    }, 'create work order cost');
  }

  /**
   * Update an existing cost item
   */
  async updateWorkOrderCost(costId: string, data: UpdateWorkOrderCostData): Promise<ApiResponse<WorkOrderCost>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('updateWorkOrderCost', { costId });
      const startTime = Date.now();

      // If quantity or unit price is being updated, recalculate total
      const updateData: any = { ...data };
      if (data.quantity !== undefined || data.unit_price_cents !== undefined) {
        const existingCost = await this.repository.findById(costId);
        if (!existingCost) {
          throw new Error('Cost item not found');
        }

        const quantity = data.quantity ?? existingCost.quantity;
        const unitPrice = data.unit_price_cents ?? existingCost.unit_price_cents;
        updateData.total_price_cents = quantity * unitPrice;
      }

      const cost = await this.repository.update(costId, updateData);
      
      this.logOperationComplete('updateWorkOrderCost', Date.now() - startTime, { costId });
      return cost;
    }, 'update work order cost');
  }

  /**
   * Delete a cost item
   */
  async deleteWorkOrderCost(costId: string): Promise<ApiResponse<void>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('deleteWorkOrderCost', { costId });
      const startTime = Date.now();

      await this.repository.delete(costId);
      
      this.logOperationComplete('deleteWorkOrderCost', Date.now() - startTime, { costId });
    }, 'delete work order cost');
  }

  /**
   * Get cost summary for a work order
   */
  async getCostSummary(workOrderId: string): Promise<ApiResponse<WorkOrderCostSummary>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getCostSummary', { workOrderId });
      const startTime = Date.now();

      const summary = await this.repository.getCostSummary(workOrderId);
      
      this.logOperationComplete('getCostSummary', Date.now() - startTime, { workOrderId });
      return summary;
    }, 'get cost summary');
  }

  /**
   * Get costs with filters
   */
  async getCostsWithFilters(filters: WorkOrderCostFilters, pagination?: PaginationParams): Promise<ApiResponse<WorkOrderCost[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getCostsWithFilters', { filters });
      const startTime = Date.now();

      const queryFilters: FilterParams = {
        ...filters,
        ...this.getOrganizationContext()
      };

      const costs = await this.repository.findMany(queryFilters, pagination);
      
      this.logOperationComplete('getCostsWithFilters', Date.now() - startTime, { filters, count: costs.length });
      return costs;
    }, 'get costs with filters');
  }

  /**
   * Bulk update costs
   */
  async bulkUpdateCosts(data: WorkOrderCostBulkUpdateData): Promise<ApiResponse<WorkOrderCost[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('bulkUpdateCosts', { costIds: data.cost_ids });
      const startTime = Date.now();

      const updatedCosts: WorkOrderCost[] = [];
      
      for (const costId of data.cost_ids) {
        const cost = await this.repository.update(costId, data.updates);
        updatedCosts.push(cost);
      }
      
      this.logOperationComplete('bulkUpdateCosts', Date.now() - startTime, { 
        costIds: data.cost_ids, 
        count: updatedCosts.length 
      });
      return updatedCosts;
    }, 'bulk update costs');
  }

  /**
   * Get costs by date range
   */
  async getCostsByDateRange(startDate: string, endDate: string, workOrderId?: string): Promise<ApiResponse<WorkOrderCost[]>> {
    return this.executeWithErrorHandling(async () => {
      this.logOperationStart('getCostsByDateRange', { startDate, endDate, workOrderId });
      const startTime = Date.now();

      const filters: FilterParams = {
        created_at: {
          gte: startDate,
          lte: endDate
        },
        ...this.getOrganizationContext()
      };

      if (workOrderId) {
        filters.work_order_id = workOrderId;
      }

      const costs = await this.repository.findMany(filters);
      
      this.logOperationComplete('getCostsByDateRange', Date.now() - startTime, { 
        startDate, 
        endDate, 
        workOrderId, 
        count: costs.length 
      });
      return costs;
    }, 'get costs by date range');
  }
}

// Export singleton instance factory
export const createWorkOrderCostsService = (organizationId: string) => new WorkOrderCostsService(organizationId);
