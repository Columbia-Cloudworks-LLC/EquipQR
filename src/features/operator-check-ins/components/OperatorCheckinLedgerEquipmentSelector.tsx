// fallow-ignore-file code-duplication
// Duplication rationale: Ledger equipment filter mirrors template assignment popover UX.
import { useMemo, useState } from 'react';
import { ChevronDown, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { buildEquipmentScopeLabel } from '@/features/operator-check-ins/utils/operatorCheckinLedgerScope';
import type { LedgerAssignedEquipmentOption } from '@/features/operator-check-ins/utils/operatorCheckinLedgerScope';

interface OperatorCheckinLedgerEquipmentSelectorProps {
  options: LedgerAssignedEquipmentOption[];
  selectedEquipmentIds: string[];
  onSelectedEquipmentIdsChange: (equipmentIds: string[]) => void;
  disabled?: boolean;
}

export function OperatorCheckinLedgerEquipmentSelector({
  options,
  selectedEquipmentIds,
  onSelectedEquipmentIdsChange,
  disabled = false,
}: OperatorCheckinLedgerEquipmentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => {
      const haystack = [option.name, option.serialNumber ?? ''].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [options, search]);

  const filteredIds = useMemo(
    () => filteredOptions.map((option) => option.equipmentId),
    [filteredOptions],
  );

  const triggerLabel = buildEquipmentScopeLabel(options, selectedEquipmentIds);

  function toggleEquipment(equipmentId: string, checked: boolean) {
    onSelectedEquipmentIdsChange(
      checked
        ? [...new Set([...selectedEquipmentIds, equipmentId])]
        : selectedEquipmentIds.filter((id) => id !== equipmentId),
    );
  }

  function selectAll() {
    onSelectedEquipmentIdsChange([...new Set([...selectedEquipmentIds, ...filteredIds])]);
  }

  function selectNone() {
    onSelectedEquipmentIdsChange([]);
  }

  function selectInverse() {
    const next = new Set(selectedEquipmentIds);
    for (const id of filteredIds) {
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
    }
    onSelectedEquipmentIdsChange([...next]);
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No equipment is assigned to this report template yet.
      </p>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
          disabled={disabled}
          aria-label="Select equipment records"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Truck className="h-4 w-4 shrink-0" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Equipment records</p>
            <p className="text-xs text-muted-foreground">
              Choose one or more assigned equipment records for this report.
            </p>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search equipment..."
            aria-label="Search equipment"
          />
          {filteredOptions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={disabled || filteredIds.length === 0}
                onClick={selectAll}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={disabled || selectedEquipmentIds.length === 0}
                onClick={selectNone}
              >
                Select none
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={disabled || filteredIds.length === 0}
                onClick={selectInverse}
              >
                Inverse
              </Button>
            </div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto border-y px-4 py-2">
          {filteredOptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No equipment matches your search.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredOptions.map((option) => {
                const checkboxId = `ledger-equipment-${option.equipmentId}`;
                return (
                  <li
                    key={option.equipmentId}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={selectedEquipmentIds.includes(option.equipmentId)}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        toggleEquipment(option.equipmentId, checked === true)}
                    />
                    <Label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer space-y-1">
                      <span className="block font-medium leading-tight">{option.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {option.serialNumber ? `Unit ${option.serialNumber}` : 'No serial number'}
                      </span>
                    </Label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-4">
          <p className="text-xs text-muted-foreground">
            {selectedEquipmentIds.length} selected
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
