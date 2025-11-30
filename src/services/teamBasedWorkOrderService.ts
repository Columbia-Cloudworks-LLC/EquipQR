import { logger } from '../utils/logger';

import { supabase } from '@/integrations/supabase/client';
import type { EnhancedWorkOrder } from '@/services/workOrdersEnhancedService';
import { getAccessibleEquipmentIds } from './EquipmentService';

export interface TeamBasedWorkOrderFilters {
  status?: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'all';
  assigneeId?: string;
  teamId?: string;
  priority?: 'low' | 'medium' | 'high' | 'all';
  dueDateFilter?: 'overdue' | 'today' | 'this_week';
  search?: string;
}

// Get work orders filtered by team-accessible equipment
export const getTeamBasedWorkOrders = async (
  organizationId: string,
  userTeamIds: string[],
  isOrgAdmin: boolean = false,
  filters: TeamBasedWorkOrderFilters = {}
): Promise<EnhancedWorkOrder[]> => {
  try {
    // First, get the equipment IDs that this user can access
    const accessibleEquipmentIds = await getAccessibleEquipmentIds(organizationId, userTeamIds, isOrgAdmin);
    
    if (accessibleEquipmentIds.length === 0) {
      return [];
    }

    let query = supabase
      .from('work_orders')
      .select(`
        id,
        title,
        description,
        equipment_id,
        organization_id,
        priority,
        status,
        assignee_id,
        created_date,
        due_date,
        estimated_hours,
        completed_date,
        created_by,
        equipment:equipment_id (
          name,
          team_id,
          teams:team_id (
            name
          )
        ),
        assignee:profiles!work_orders_assignee_id_fkey (
          name
        ),
        creator:profiles!work_orders_created_by_fkey (
          name
        )
      `)
      .eq('organization_id', organizationId)
      .in('equipment_id', accessibleEquipmentIds);

    // Apply additional filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.assigneeId && filters.assigneeId !== 'all') {
      if (filters.assigneeId === 'unassigned') {
        query = query.is('assignee_id', null);
      } else {
        query = query.eq('assignee_id', filters.assigneeId);
      }
    }

    // Team filtering is handled by equipment access - we already filtered by accessible equipment IDs
    // If filtering by specific team, we would need to get equipment IDs for that team first
    // For now, filtering by teamId is done at the equipment level in getAccessibleEquipmentIds

    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    // Due date filtering
    if (filters.dueDateFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      switch (filters.dueDateFilter) {
        case 'overdue':
          query = query.lt('due_date', today.toISOString());
          break;
        case 'today': {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          query = query.gte('due_date', today.toISOString()).lt('due_date', tomorrow.toISOString());
          break;
        }
        case 'this_week':
          query = query.gte('due_date', today.toISOString()).lt('due_date', weekFromNow.toISOString());
          break;
      }
    }

    // Order by created_date descending (most recent first)
    query = query.order('created_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      logger.error('❌ Error fetching team-based work orders:', error);
      throw error;
    }

    return (data || []).map(wo => ({
      id: wo.id,
      title: wo.title,
      description: wo.description,
      equipmentId: wo.equipment_id,
      organizationId: wo.organization_id,
      priority: wo.priority,
      status: wo.status,
      assigneeId: wo.assignee_id,
      assigneeName: wo.assignee?.name,
      teamId: wo.equipment?.team_id,
      teamName: wo.equipment?.teams?.name,
      createdDate: wo.created_date,
      created_date: wo.created_date,
      dueDate: wo.due_date,
      estimatedHours: wo.estimated_hours,
      completedDate: wo.completed_date,
      equipmentName: wo.equipment?.name,
      createdByName: wo.creator?.name
    }));
  } catch (error) {
    logger.error('Error in getTeamBasedWorkOrders:', error);
    throw error;
  }
};

