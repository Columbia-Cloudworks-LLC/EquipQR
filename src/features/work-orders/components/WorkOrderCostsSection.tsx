
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { useWorkOrderCosts } from '@/features/work-orders/hooks/useWorkOrderCosts';
import { useWorkOrderEquipment } from '@/features/work-orders/hooks/useWorkOrderEquipment';
import InlineEditWorkOrderCosts from './InlineEditWorkOrderCosts';

interface WorkOrderCostsSectionProps {
  workOrderId: string;
  canAddCosts: boolean;
  canEditCosts: boolean;
  /** Primary equipment ID from the work order (legacy field) */
  primaryEquipmentId?: string | null;
}

const WorkOrderCostsSection: React.FC<WorkOrderCostsSectionProps> = ({
  workOrderId,
  canAddCosts,
  canEditCosts,
  primaryEquipmentId
}) => {
  const { data: costs = [], isLoading } = useWorkOrderCosts(workOrderId);
  const { data: linkedEquipment = [] } = useWorkOrderEquipment(workOrderId);
  
  // Get all equipment IDs for this work order (for filtering compatible inventory items)
  // Combine junction table equipment with the primary equipment_id from work order
  const junctionEquipmentIds = linkedEquipment.map(eq => eq.equipment_id).filter(Boolean) as string[];
  const equipmentIds = React.useMemo(() => {
    const ids = new Set(junctionEquipmentIds);
    if (primaryEquipmentId) {
      ids.add(primaryEquipmentId);
    }
    return Array.from(ids);
  }, [junctionEquipmentIds, primaryEquipmentId]);

  if (isLoading) {
    return (
      <Card className="shadow-elevation-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Loading Costs...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elevation-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Itemized Costs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InlineEditWorkOrderCosts
          costs={costs}
          workOrderId={workOrderId}
          equipmentIds={equipmentIds}
          canEdit={canAddCosts || canEditCosts}
        />
      </CardContent>
    </Card>
  );
};

export default WorkOrderCostsSection;
