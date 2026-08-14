import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentSummaries, useEquipmentById } from '@/features/equipment/hooks/useEquipment';
import type { EquipmentSummary, EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { isOrgAdminRole } from '@/features/teams/utils/teamAccessScope';
import type { WorkOrder as EnhancedWorkOrder } from '@/features/work-orders/types/workOrder';

interface UseEquipmentSelectionProps {
  equipmentId?: string;
  workOrder?: EnhancedWorkOrder;
}

export interface UseEquipmentSelectionResult {
  allEquipment: EquipmentSummary[];
  preSelectedEquipment: EquipmentWithTeam | undefined;
  isEquipmentPreSelected: boolean;
}

/**
 * Equipment data plumbing for the work-order form's equipment selector.
 *
 * `allEquipment` is loaded as the lightweight summaries projection (small
 * payload, fast on Slow 4G); only the pre-selected single equipment row is
 * loaded as a full record because `useEquipmentById` is what the form's
 * read-only display actually consumes.
 */
export const useEquipmentSelection = ({
  equipmentId,
  workOrder,
}: UseEquipmentSelectionProps): UseEquipmentSelectionResult => {
  const { currentOrganization } = useOrganization();
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const isOrgAdmin = isOrgAdminRole(currentOrganization?.userRole);
  const teamsReady = isOrgAdmin || !teamsLoading;

  const { data: allEquipment = [] } = useEquipmentSummaries(currentOrganization?.id);
  const { data: preSelectedEquipment } = useEquipmentById(
    currentOrganization?.id,
    equipmentId || workOrder?.equipment_id,
    {
      userTeamIds: isOrgAdmin ? undefined : getUserTeamIds(),
      isOrgAdmin,
      enabled: teamsReady,
    },
  );

  const isEquipmentPreSelected = !!preSelectedEquipment || !!workOrder;

  return {
    allEquipment,
    preSelectedEquipment,
    isEquipmentPreSelected,
  };
};
