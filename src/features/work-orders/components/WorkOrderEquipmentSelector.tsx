import React, { useMemo, useState } from 'react';
import { Forklift, Clock, Edit, Plus, List, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { useEquipmentCurrentWorkingHours, useUpdateEquipmentWorkingHours } from '@/features/equipment/hooks/useEquipmentWorkingHours';
import { QuickEquipmentForm } from '@/features/equipment/components/QuickEquipmentForm';
import type { EquipmentSelectorItem } from '@/features/work-orders/types/workOrderEquipment';
import { filterEquipmentSelectorItems } from '@/features/work-orders/utils/filterEquipmentSelectorItems';
import { cn } from '@/lib/utils';

type EquipmentMode = 'select' | 'create';

interface WorkOrderEquipmentSelectorProps {
  values: WorkOrderFormData;
  errors: Record<string, string>;
  setValue: (field: keyof WorkOrderFormData, value: unknown) => void;
  preSelectedEquipment?: EquipmentSelectorItem;
  allEquipment: EquipmentSelectorItem[];
  isEditMode: boolean;
  isEquipmentPreSelected: boolean;
  /**
   * Function to check if user can create equipment for a specific team.
   * If not provided, quick equipment creation will be disabled.
   */
  canCreateEquipmentForTeam?: (teamId: string) => boolean;
  /**
   * Called when new equipment is successfully created via quick entry.
   */
  onEquipmentCreated?: (equipmentId: string) => void;
  /**
   * Whether user has any teams they can create equipment for.
   * If false, the Create New tab won't be shown.
   */
  canCreateEquipment?: boolean;
}

/**
 * Utility function to get the display text for equipment location.
 * Returns the last known location name, fallback location, or 'Unknown location'.
 */
const getEquipmentLocationDisplay = (equipment: EquipmentSelectorItem): string => {
  return equipment.last_known_location?.name || equipment.location || 'Unknown location';
};

const formatEquipmentTriggerLabel = (equipment: EquipmentSelectorItem): string => {
  return `${equipment.name}${equipment.serial_number ? ` • ${equipment.serial_number}` : ''}`;
};

const EquipmentOptionDetails: React.FC<{ equipment: EquipmentSelectorItem }> = ({ equipment }) => {
  const locationDisplay = getEquipmentLocationDisplay(equipment);

  return (
    <div className="flex min-w-0 flex-col gap-0.5 py-1 text-left">
      <span className="font-medium">{equipment.name}</span>
      <span className="text-xs text-muted-foreground">
        {[equipment.manufacturer, equipment.model].filter(Boolean).join(' ')}
        {equipment.serial_number ? ` • S/N: ${equipment.serial_number}` : ''}
        {equipment.working_hours != null ? ` • ${equipment.working_hours.toLocaleString()} hrs` : ''}
      </span>
      <span className="text-xs text-muted-foreground">
        {equipment.team?.name || 'No team'} • {locationDisplay}
      </span>
    </div>
  );
};

const WorkingHoursSection: React.FC<{ equipmentId: string; setValue: (field: string, value: unknown) => void; }> = ({ equipmentId, setValue }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [newHours, setNewHours] = useState('');

  const { data: currentHours } = useEquipmentCurrentWorkingHours(equipmentId);
  const updateWorkingHours = useUpdateEquipmentWorkingHours();

  const handleUpdateClick = () => {
    setIsUpdating(true);
    setNewHours(currentHours?.toString() || '');
  };

  const handleSave = () => {
    const hoursValue = parseFloat(newHours);
    if (!isNaN(hoursValue) && hoursValue >= 0) {
      setValue('equipmentWorkingHours', hoursValue);
      updateWorkingHours.mutate({
        equipmentId,
        newHours: hoursValue,
        updateSource: 'work_order',
      });
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsUpdating(false);
    setNewHours('');
  };

  return (
    <div className="mt-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Equipment Hours</span>
        </div>
        {!isUpdating && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUpdateClick}
            className="h-7 px-2"
          >
            <Edit className="mr-1 h-3 w-3" />
            Update
          </Button>
        )}
      </div>

      {isUpdating ? (
        <div className="mt-2 space-y-2">
          <Input
            type="number"
            min="0"
            step="0.1"
            value={newHours}
            onChange={(e) => setNewHours(e.target.value)}
            placeholder="Enter equipment hours"
            className="h-8"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={updateWorkingHours.isPending}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-1 text-sm text-muted-foreground">
          Current: {currentHours ? `${currentHours} hours` : '—'}
        </div>
      )}
    </div>
  );
};

export const WorkOrderEquipmentSelector: React.FC<WorkOrderEquipmentSelectorProps> = ({
  values,
  errors,
  setValue,
  preSelectedEquipment,
  allEquipment,
  isEditMode,
  isEquipmentPreSelected,
  canCreateEquipmentForTeam,
  onEquipmentCreated,
  canCreateEquipment = false,
}) => {
  const [mode, setMode] = useState<EquipmentMode>('select');
  const [equipmentSearchOpen, setEquipmentSearchOpen] = useState(false);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const selectedEquipment = allEquipment.find((equipment) => equipment.id === values.equipmentId);

  const filteredSearchEquipment = useMemo(
    () => filterEquipmentSelectorItems(allEquipment, equipmentSearchQuery),
    [allEquipment, equipmentSearchQuery],
  );

  const handleEquipmentCreated = (equipmentId: string) => {
    setValue('equipmentId', equipmentId);
    setMode('select');
    onEquipmentCreated?.(equipmentId);
  };

  const handleSearchDialogOpenChange = (open: boolean) => {
    setEquipmentSearchOpen(open);
    if (!open) {
      setEquipmentSearchQuery('');
    }
  };

  const handleSearchSelect = (equipmentId: string) => {
    setValue('equipmentId', equipmentId);
    handleSearchDialogOpenChange(false);
  };

  if (isEquipmentPreSelected) {
    const equipment = preSelectedEquipment;
    if (!equipment) return null;

    const locationDisplay = getEquipmentLocationDisplay(equipment);

    return (
      <div className="space-y-2">
        <Label>Equipment</Label>
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
          <Forklift className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{equipment.name}</div>
            <div className="text-sm text-muted-foreground">
              {[equipment.manufacturer, equipment.model].filter(Boolean).join(' ')}
              {equipment.serial_number ? ` • S/N: ${equipment.serial_number}` : ''}
              {equipment.working_hours != null ? ` • ${equipment.working_hours.toLocaleString()} hrs` : ''}
            </div>
            <div className="text-sm text-muted-foreground">
              {equipment.team?.name || 'No team'} • {locationDisplay}
            </div>
          </div>
          <Badge variant="secondary" className="flex-shrink-0 text-xs">
            {isEditMode ? 'Current' : 'Selected'}
          </Badge>
        </div>
        <WorkingHoursSection equipmentId={equipment.id} setValue={setValue} />
      </div>
    );
  }

  const showCreateOption = canCreateEquipment && canCreateEquipmentForTeam && !isEditMode;

  return (
    <div className="space-y-3">
      <Label htmlFor="work-order-equipment-select">Equipment *</Label>

      {showCreateOption && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as EquipmentMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span>Select Existing</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Create New</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {mode === 'select' && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={values.equipmentId || undefined}
              onValueChange={(equipmentId) => setValue('equipmentId', equipmentId)}
            >
              <SelectTrigger
                id="work-order-equipment-select"
                aria-label="Select equipment"
                className={cn('h-auto min-h-11 w-full sm:flex-1', !selectedEquipment && 'text-muted-foreground')}
              >
                <SelectValue placeholder="Select equipment">
                  {selectedEquipment ? formatEquipmentTriggerLabel(selectedEquipment) : 'Select equipment'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60">
                {allEquipment.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No equipment available
                  </div>
                ) : (
                  allEquipment.map((equipment) => (
                    <SelectItem
                      key={equipment.id}
                      value={equipment.id}
                      className="items-start py-2"
                    >
                      <EquipmentOptionDetails equipment={equipment} />
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0"
              onClick={() => setEquipmentSearchOpen(true)}
            >
              <Search className="mr-2 h-4 w-4" aria-hidden />
              Search equipment
            </Button>
          </div>

          <Dialog open={equipmentSearchOpen} onOpenChange={handleSearchDialogOpenChange} modal>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Search equipment</DialogTitle>
                <DialogDescription>
                  Filter and select equipment for this work order.
                </DialogDescription>
              </DialogHeader>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  placeholder="Search equipment..."
                  value={equipmentSearchQuery}
                  onChange={(event) => setEquipmentSearchQuery(event.target.value)}
                  className="pl-9"
                  aria-label="Search equipment"
                />
              </div>

              <div className="max-h-96 space-y-1 overflow-y-auto overscroll-contain rounded-md border p-2">
                {filteredSearchEquipment.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {allEquipment.length === 0
                      ? 'No equipment available'
                      : 'No equipment found matching your search'}
                  </p>
                ) : (
                  filteredSearchEquipment.map((equipment) => (
                    <button
                      key={equipment.id}
                      type="button"
                      aria-label={`Select ${equipment.name}`}
                      onClick={() => handleSearchSelect(equipment.id)}
                      className={cn(
                        'w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        values.equipmentId === equipment.id && 'bg-muted/50',
                      )}
                    >
                      <EquipmentOptionDetails equipment={equipment} />
                    </button>
                  ))
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleSearchDialogOpenChange(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {errors.equipmentId && (
            <p className="text-sm text-destructive">{errors.equipmentId}</p>
          )}
          {values.equipmentId && (
            <WorkingHoursSection equipmentId={values.equipmentId} setValue={setValue} />
          )}
        </div>
      )}

      {mode === 'create' && canCreateEquipmentForTeam && (
        <QuickEquipmentForm
          onEquipmentCreated={handleEquipmentCreated}
          onCancel={() => setMode('select')}
          canCreateForTeam={canCreateEquipmentForTeam}
        />
      )}
    </div>
  );
};
