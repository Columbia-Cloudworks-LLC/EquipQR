import React from 'react';
import { Package, Crown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkOrderEquipment } from '@/components/work-orders/hooks/useWorkOrderEquipment';

interface WorkOrderEquipmentSelectorProps {
  workOrderId: string;
  selectedEquipmentId: string;
  onEquipmentChange: (equipmentId: string) => void;
}

export const WorkOrderEquipmentSelector: React.FC<WorkOrderEquipmentSelectorProps> = ({
  workOrderId,
  selectedEquipmentId,
  onEquipmentChange,
}) => {
  const { data: linkedEquipment = [], isLoading } = useWorkOrderEquipment(workOrderId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Equipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (linkedEquipment.length <= 1) {
    return null; // Don't show selector if only one equipment
  }

  const selectedEquipment = linkedEquipment.find(eq => eq.equipment_id === selectedEquipmentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Equipment ({linkedEquipment.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={selectedEquipmentId} onValueChange={onEquipmentChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select equipment" />
          </SelectTrigger>
          <SelectContent>
            {linkedEquipment.map((equipment) => (
              <SelectItem key={equipment.equipment_id} value={equipment.equipment_id}>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {equipment.is_primary && (
                      <Crown className="h-3 w-3 text-yellow-500" />
                    )}
                    <span className="font-medium">
                      {equipment.equipment?.name || 'Unknown Equipment'}
                    </span>
                    {equipment.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground ml-2">
                    {equipment.equipment?.manufacturer || ''} {equipment.equipment?.model || ''}
                    {equipment.equipment?.location && ` • ${equipment.equipment.location}`}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedEquipment && (
          <div className="mt-3 p-3 bg-muted/30 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedEquipment.equipment?.name}</span>
              {selectedEquipment.is_primary && (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Primary
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedEquipment.equipment?.manufacturer || ''} {selectedEquipment.equipment?.model || ''}
              {selectedEquipment.equipment?.serial_number && ` • S/N: ${selectedEquipment.equipment.serial_number}`}
              {selectedEquipment.equipment?.location && ` • ${selectedEquipment.equipment.location}`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
