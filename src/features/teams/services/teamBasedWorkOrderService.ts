import { logger } from '@/utils/logger';

import { supabase } from '@/integrations/supabase/client';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { resolveEffectiveLocation } from '@/utils/effectiveLocation';

/**
 * TeamBasedWorkOrder extends WorkOrder with camelCase aliases for backward compatibility.
 * These aliases map to the snake_case database fields.
 */
type TeamBasedWorkOrder = WorkOrder & {
  equipmentId?: string;
  organizationId?: string;
  assigneeId?: string | null;
  teamId?: string | null;
  createdDate?: string;
  dueDate?: string | null;
  estimatedHours?: number | null;
  completedDate?: string | null;
};

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
): Promise<TeamBasedWorkOrder[]> => {
  try {
    // Org admins can see all work orders in the org — scoping by organization_id
    // alone is sufficient and avoids the large equipment-ID IN() clause that
    // inflates request URLs on orgs with many assets.
    // Non-admins still need to resolve accessible equipment IDs for team gating.
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
        has_pm,
        equipment:equipment_id (
          name,
          manufacturer,
          model,
          serial_number,
          working_hours,
          image_url,
          team_id,
          use_team_location,
          last_known_location,
          assigned_location_lat,
          assigned_location_lng,
          assigned_location_street,
          assigned_location_city,
          assigned_location_state,
          assigned_location_country,
          teams:team_id (
            id,
            name,
            override_equipment_location,
            location_lat,
            location_lng,
            location_address,
            location_city,
            location_state,
            location_country
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
      .not('equipment_id', 'is', null);

    if (!isOrgAdmin) {
      const result = await EquipmentService.getAccessibleEquipmentIds(organizationId, userTeamIds, isOrgAdmin);
      const accessibleEquipmentIds = result.success && result.data ? result.data : [];

      if (accessibleEquipmentIds.length === 0) {
        return [];
      }

      query = query.in('equipment_id', accessibleEquipmentIds);
    }

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

    return (data || []).map(wo => {
      const lastKnown = wo.equipment?.last_known_location;
      let lastScan: { lat: number; lng: number } | undefined;
      if (lastKnown && typeof lastKnown === 'object') {
        const locationCandidate = lastKnown as Record<string, unknown>;
        const lat = Number(locationCandidate.latitude ?? locationCandidate.lat);
        const lng = Number(locationCandidate.longitude ?? locationCandidate.lng);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          lastScan = { lat, lng };
        }
      }

      const effectiveLocation = wo.equipment
        ? resolveEffectiveLocation({
            team: wo.equipment.teams
              ? {
                  override_equipment_location: wo.equipment.teams.override_equipment_location,
                  location_lat: wo.equipment.teams.location_lat,
                  location_lng: wo.equipment.teams.location_lng,
                  location_address: wo.equipment.teams.location_address,
                  location_city: wo.equipment.teams.location_city,
                  location_state: wo.equipment.teams.location_state,
                  location_country: wo.equipment.teams.location_country,
                }
              : undefined,
            equipment: {
              use_team_location: wo.equipment.use_team_location,
              assigned_location_lat: wo.equipment.assigned_location_lat,
              assigned_location_lng: wo.equipment.assigned_location_lng,
              assigned_location_street: wo.equipment.assigned_location_street,
              assigned_location_city: wo.equipment.assigned_location_city,
              assigned_location_state: wo.equipment.assigned_location_state,
              assigned_location_country: wo.equipment.assigned_location_country,
            },
            lastScan,
          })
        : null;

      return {
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
        equipmentManufacturer: wo.equipment?.manufacturer,
        equipmentModel: wo.equipment?.model,
        equipmentSerialNumber: wo.equipment?.serial_number,
        equipmentWorkingHours: wo.equipment?.working_hours,
        equipmentImageUrl: wo.equipment?.image_url,
        createdByName: wo.creator?.name,
        has_pm: wo.has_pm,
        effectiveLocation,
      };
    });
  } catch (error) {
    logger.error('Error in getTeamBasedWorkOrders:', error);
    throw error;
  }
};

