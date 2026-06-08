import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

export type InventoryEquipmentPickerItem = {
  id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
};

export type InventoryEquipmentPickerRowProps = {
  equipment: InventoryEquipmentPickerItem;
  isSelected: boolean;
  onToggle: (equipmentId: string, checked: boolean) => void;
  selectedBadgeLabel?: string;
};

export function InventoryEquipmentPickerRow({
  equipment,
  isSelected,
  onToggle,
  selectedBadgeLabel,
}: InventoryEquipmentPickerRowProps) {
  return (
    <div
      key={equipment.id}
      className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded"
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onToggle(equipment.id, checked as boolean)}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium">{equipment.name}</div>
        <div className="text-sm text-muted-foreground">
          {equipment.manufacturer} {equipment.model}
        </div>
      </div>
      {isSelected && (
        <Badge variant="secondary" className="text-xs">
          <Check className="h-3 w-3 mr-1" />
          {selectedBadgeLabel}
        </Badge>
      )}
    </div>
  );
}
