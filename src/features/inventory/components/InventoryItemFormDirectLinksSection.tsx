import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Forklift, Search } from 'lucide-react';
import { InventoryEquipmentPickerRow } from '@/features/inventory/components/InventoryEquipmentPickerRow';
import { SelectedEquipmentBadgeList } from '@/components/common/SelectedEquipmentBadgeList';
import type { InventoryItemFormData } from '@/features/inventory/schemas/inventorySchema';

type EquipmentSummary = {
  id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
};

type InventoryItemFormDirectLinksSectionProps = {
  form: UseFormReturn<InventoryItemFormData>;
  allEquipment: EquipmentSummary[];
  selectedEquipmentIds: string[];
  onEquipmentToggle: (equipmentId: string, checked: boolean) => void;
};

export function InventoryItemFormDirectLinksSection({
  form,
  allEquipment,
  selectedEquipmentIds,
  onEquipmentToggle,
}: InventoryItemFormDirectLinksSectionProps) {
  const [directLinksOpen, setDirectLinksOpen] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState('');

  const filteredEquipment = allEquipment.filter(
    eq =>
      eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
      eq.manufacturer?.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
      eq.model?.toLowerCase().includes(equipmentSearch.toLowerCase()),
  );

  return (
    <Collapsible open={directLinksOpen} onOpenChange={setDirectLinksOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between w-full text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Forklift className="h-4 w-4" />
                Compatible Equipment (Direct Links)
                {selectedEquipmentIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedEquipmentIds.length} selected
                  </Badge>
                )}
              </CardTitle>
              {directLinksOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <p className="text-sm text-muted-foreground mt-1">
            Link specific equipment directly.{' '}
            <em className="text-primary">Prefer compatibility rules above for pattern-based matching.</em>
          </p>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search equipment..."
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
              {filteredEquipment.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No equipment found</p>
              ) : (
                filteredEquipment.map((equipment) => (
                  <InventoryEquipmentPickerRow
                    key={equipment.id}
                    equipment={equipment}
                    isSelected={selectedEquipmentIds.includes(equipment.id)}
                    onToggle={onEquipmentToggle}
                  />
                ))
              )}
            </div>
            <SelectedEquipmentBadgeList
              selectedEquipmentIds={selectedEquipmentIds}
              allEquipment={allEquipment}
              onRemove={(id) => onEquipmentToggle(id, false)}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
