import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentSummaries, useEquipmentById } from '@/features/equipment/hooks/useEquipment';
import type { WorkOrder as EnhancedWorkOrder } from '@/features/work-orders/types/workOrder';

interface UseEquipmentSelectionProps {
  equipmentId?: string;
  workOrder?: EnhancedWorkOrder;
}

/**
 * Equipment data plumbing for the work-order form's equipment selector.
 *
 * `allEquipment` is loaded as the lightweight summaries projection (small
 * payload, fast on Slow 4G); only the pre-selected single equipment row is
 * loaded as a full record because `useEquipmentById` is what the form's
 * read-only display actually consumes.
 */
export const useEquipmentSelection = ({ equipmentId, workOrder }: UseEquipmentSelectionProps) => {
  const { currentOrganization } = useOrganization();

  const { data: allEquipment = [] } = useEquipmentSummaries(currentOrganization?.id);
  const { data: preSelectedEquipment } = useEquipmentById(
    currentOrganization?.id,
    equipmentId || workOrder?.equipment_id
  );

  const isEquipmentPreSelected = !!preSelectedEquipment || !!workOrder;

  return {
    allEquipment,
    preSelectedEquipment,
    isEquipmentPreSelected,
  };
};
