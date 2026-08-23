import { logger } from '@/utils/logger';

import { supabase } from '@/integrations/supabase/client';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { batchResolveEquipmentDisplayImageUrls } from '@/services/imageUploadService';
import { applyWorkOrderSupabaseFilters } from '@/features/work-orders/utils/workOrderSupabaseFilters';
import {
  WORK_ORDER_LIST_SELECT,
  mapWorkOrderRow,
} from '@/features/work-orders/services/workOrderRowMapper';
import type { SelectedTeamId } from '@/contexts/selected-team-context';
import {
  isAllTeamsScope,
  resolveDashboardEquipmentIdScope,
} from '@/features/dashboard/utils/dashboardTeamScope';

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

function toTeamBasedWorkOrder(
  wo: Record<string, unknown>,
  signedEquipmentImageUrl: string | null | undefined,
): TeamBasedWorkOrder {
  const mapped = mapWorkOrderRow(wo);
  return {
    ...mapped,
    equipmentId: mapped.equipment_id,
    organizationId: mapped.organization_id,
    assigneeId: mapped.assignee_id,
    teamId: mapped.team_id ?? mapped.equipment?.team_id ?? null,
    createdDate: mapped.created_date,
    dueDate: mapped.due_date,
    estimatedHours: mapped.estimated_hours,
    completedDate: mapped.completed_date,
    equipmentImageUrl: signedEquipmentImageUrl ?? mapped.equipmentImageUrl,
  };
}

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
  filters: TeamBasedWorkOrderFilters = {},
  selectedTeamId: SelectedTeamId | undefined = null,
): Promise<TeamBasedWorkOrder[]> => {
  try {
    // Org admins can see all work orders in the org — scoping by organization_id
    // alone is sufficient and avoids the large equipment-ID IN() clause that
    // inflates request URLs on orgs with many assets.
    // Non-admins still need to resolve accessible equipment IDs for team gating.
    let query = supabase
      .from('work_orders')
      .select(WORK_ORDER_LIST_SELECT)
      .eq('organization_id', organizationId)
      // Exclude work orders without equipment. The previous implementation
      // always applied .in('equipment_id', accessibleEquipmentIds) which
      // implicitly excluded null equipment_id rows; preserving that behaviour
      // here ensures org-admin queries are consistent with non-admin queries.
      .not('equipment_id', 'is', null);

    const equipmentScope = await resolveDashboardEquipmentIdScope(
      organizationId,
      selectedTeamId,
      userTeamIds,
      isOrgAdmin,
    );

    if (equipmentScope.type === 'none') {
      return [];
    }

    const needsEquipmentFilter =
      equipmentScope.type === 'ids' || !isOrgAdmin || !isAllTeamsScope(selectedTeamId);

    if (needsEquipmentFilter) {
      let accessibleEquipmentIds: string[] = [];
      if (equipmentScope.type === 'ids') {
        accessibleEquipmentIds = equipmentScope.ids;
      } else {
        const result = await EquipmentService.getAccessibleEquipmentIds(
          organizationId,
          userTeamIds,
          isOrgAdmin,
        );
        accessibleEquipmentIds = result.success && result.data ? result.data : [];
      }

      if (accessibleEquipmentIds.length === 0) {
        return [];
      }

      query = query.in('equipment_id', accessibleEquipmentIds);
    }

    query = applyWorkOrderSupabaseFilters(query, filters);

    // Order by created_date descending (most recent first)
    query = query.order('created_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      logger.error('❌ Error fetching team-based work orders:', error);
      throw error;
    }

    const rows = (data ?? []) as unknown as Array<
      Record<string, unknown> & {
        equipment_id: string;
        equipment?: { image_url?: string | null };
      }
    >;

    // equipment.image_url stores a canonical private-bucket path; sign it here
    // so list cards never emit a relative path into <img src> (#1086 — the
    // browser would resolve it against /dashboard/... and 404).
    const equipmentImageUrls = await batchResolveEquipmentDisplayImageUrls(
      rows.map((wo) => wo.equipment?.image_url ?? null),
      { equipmentIds: rows.map((wo) => wo.equipment_id) },
    );

    return rows.map((wo, index) => toTeamBasedWorkOrder(wo, equipmentImageUrls[index]));
  } catch (error) {
    logger.error('Error in getTeamBasedWorkOrders:', error);
    throw error;
  }
};

