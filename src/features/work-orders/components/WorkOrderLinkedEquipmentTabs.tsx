import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Forklift } from 'lucide-react';
import type { WorkOrderEquipmentWithDetails } from '@/features/work-orders/types/workOrderEquipment';

interface WorkOrderLinkedEquipmentTabsProps {
  linkedEquipment: WorkOrderEquipmentWithDetails[];
  selectedEquipmentId: string;
  onEquipmentChange: (equipmentId: string) => void;
}

export function WorkOrderLinkedEquipmentTabs({
  linkedEquipment,
  selectedEquipmentId,
  onEquipmentChange,
}: WorkOrderLinkedEquipmentTabsProps) {
  return (
    <Card className="shadow-elevation-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Forklift className="h-4 w-4" aria-hidden />
          Linked equipment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedEquipmentId} onValueChange={onEquipmentChange}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            {linkedEquipment.map((row) => (
              <TabsTrigger key={row.equipment_id} value={row.equipment_id} className="min-h-[44px]">
                {row.equipment?.name ?? 'Equipment'}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}
