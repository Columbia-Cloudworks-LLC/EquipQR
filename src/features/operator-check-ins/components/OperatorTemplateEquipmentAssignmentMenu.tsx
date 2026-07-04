import { useMemo, useState } from 'react';
import { Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { EquipmentSummary } from '@/features/equipment/services/EquipmentService';
import type { EquipmentOperatorCheckinAssignment } from '@/features/operator-check-ins/services/operatorCheckinSettingsService';

interface OperatorTemplateEquipmentAssignmentMenuProps {
  templateId: string;
  templateName: string;
  equipment: EquipmentSummary[];
  assignments: EquipmentOperatorCheckinAssignment[];
  isEquipmentLoading: boolean;
  isAssignmentsLoading: boolean;
  isAssigning: boolean;
  onAssignEquipmentIds: (equipmentIds: string[]) => void | Promise<void>;
}

export function OperatorTemplateEquipmentAssignmentMenu({
  templateId,
  templateName,
  equipment,
  assignments,
  isEquipmentLoading,
  isAssignmentsLoading,
  isAssigning,
  onAssignEquipmentIds,
}: OperatorTemplateEquipmentAssignmentMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

  const assignedEquipmentIds = useMemo(
    () =>
      new Set(
        assignments
          .filter((assignment) => assignment.template_id === templateId)
          .map((assignment) => assignment.equipment_id),
      ),
    [assignments, templateId],
  );

  const filteredEquipment = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return equipment;
    return equipment.filter((item) => {
      const haystack = [
        item.name,
        item.serial_number ?? '',
        item.team_name ?? '',
        item.location ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [equipment, search]);

  const selectableFilteredIds = useMemo(
    () =>
      filteredEquipment
        .filter((item) => !assignedEquipmentIds.has(item.id))
        .map((item) => item.id),
    [filteredEquipment, assignedEquipmentIds],
  );

  function toggleEquipment(equipmentId: string, checked: boolean) {
    setSelectedEquipmentIds((current) =>
      checked ? [...current, equipmentId] : current.filter((id) => id !== equipmentId),
    );
  }

  function selectAll() {
    setSelectedEquipmentIds((current) => [
      ...new Set([...current, ...selectableFilteredIds]),
    ]);
  }

  function selectNone() {
    setSelectedEquipmentIds([]);
  }

  function selectInverse() {
    setSelectedEquipmentIds((current) => {
      const next = new Set(current);
      for (const id of selectableFilteredIds) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return [...next];
    });
  }

  async function handleAssign() {
    if (selectedEquipmentIds.length === 0) return;
    await onAssignEquipmentIds(selectedEquipmentIds);
    setSelectedEquipmentIds([]);
    setSearch('');
    setOpen(false);
  }

  const isLoading = isEquipmentLoading || isAssignmentsLoading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={isAssigning}>
          <Truck className="mr-2 h-4 w-4" />
          Assign to equipment
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Assign {templateName}</p>
            <p className="text-xs text-muted-foreground">
              Choose one or more equipment records in the current team scope.
            </p>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search equipment..."
            aria-label="Search equipment"
          />
          {!isLoading && filteredEquipment.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={isAssigning || selectableFilteredIds.length === 0}
                onClick={selectAll}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={isAssigning || selectedEquipmentIds.length === 0}
                onClick={selectNone}
              >
                Select none
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={isAssigning || selectableFilteredIds.length === 0}
                onClick={selectInverse}
              >
                Inverse
              </Button>
            </div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto border-y px-4 py-2">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading equipment…</p>
          ) : filteredEquipment.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No equipment in the current team scope.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredEquipment.map((item) => {
                const isAssigned = assignedEquipmentIds.has(item.id);
                const checkboxId = `assign-${templateId}-${item.id}`;
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={isAssigned || selectedEquipmentIds.includes(item.id)}
                      disabled={isAssigned || isAssigning}
                      onCheckedChange={(checked) => toggleEquipment(item.id, checked === true)}
                    />
                    <Label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer space-y-1">
                      <span className="block font-medium leading-tight">{item.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {item.serial_number ? `Unit ${item.serial_number}` : 'No serial number'}
                        {' · '}
                        {item.team_name ?? 'Unassigned'}
                      </span>
                      {isAssigned && (
                        <Badge variant="secondary" className="mt-1 font-normal">
                          Assigned
                        </Badge>
                      )}
                    </Label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-4">
          <p className="text-xs text-muted-foreground">
            {selectedEquipmentIds.length} selected
          </p>
          <Button
            type="button"
            size="sm"
            disabled={isAssigning || selectedEquipmentIds.length === 0}
            onClick={() => void handleAssign()}
          >
            {isAssigning ? 'Assigning...' : 'Assign checklist'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
