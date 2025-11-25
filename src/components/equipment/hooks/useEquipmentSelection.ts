import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipment, useEquipmentById } from './useEquipment';
import { EnhancedWorkOrder } from '@/services/workOrderDataService';

interface UseEquipmentSelectionProps {
  equipmentId?: string;
  workOrder?: EnhancedWorkOrder;
}

export const useEquipmentSelection = ({ equipmentId, workOrder }: UseEquipmentSelectionProps) => {
  const { currentOrganization } = useOrganization();
  
  const { data: allEquipment = [] } = useEquipment(currentOrganization?.id);
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