import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type EquipmentNameLookup = { id: string; name: string };

type SelectedEquipmentBadgeListProps = {
  selectedEquipmentIds: string[];
  allEquipment: EquipmentNameLookup[];
  onRemove: (id: string) => void;
  removeControl?: 'icon' | 'button';
};

export function SelectedEquipmentBadgeList({
  selectedEquipmentIds,
  allEquipment,
  onRemove,
  removeControl = 'icon',
}: SelectedEquipmentBadgeListProps) {
  if (selectedEquipmentIds.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {selectedEquipmentIds.map((id) => {
        const equipment = allEquipment.find((eq) => eq.id === id);
        if (!equipment) return null;

        return (
          <Badge key={id} variant="secondary" className="gap-1">
            {equipment.name}
            {removeControl === 'button' ? (
              <button
                type="button"
                aria-label={`Remove ${equipment.name} from selected equipment`}
                onClick={() => onRemove(id)}
                className="ml-1 inline-flex items-center justify-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onRemove(id)}
              />
            )}
          </Badge>
        );
      })}
    </div>
  );
}
