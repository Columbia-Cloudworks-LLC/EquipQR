import React, { useState } from 'react';
import { Forklift, Clock, Edit, Plus, List } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { useEquipmentCurrentWorkingHours, useUpdateEquipmentWorkingHours } from '@/features/equipment/hooks/useEquipmentWorkingHours';
import { QuickEquipmentForm } from '@/features/equipment/components/QuickEquipmentForm';

type EquipmentMode = 'select' | 'create';

interface WorkOrderEquipmentSelectorProps {
  values: WorkOrderFormData;
  errors: Record<string, string>;
  setValue: (field: keyof WorkOrderFormData, value: unknown) => void;
  preSelectedEquipment?: { 
    id: string; 
    name: string; 
    manufacturer?: string | null; 
    model?: string | null; 
    serial_number?: string | null;
    location?: string | null;
    last_known_location?: { name?: string } | null;
    team?: { id: string; name: string } | null;
    working_hours?: number | null;
  };
  allEquipment: Array<{ 
    id: string; 
    name: string; 
    manufacturer?: string | null; 
    model?: string | null; 
    serial_number?: string | null;
    location?: string | null;
    last_known_location?: { name?: string } | null;
    team?: { id: string; name: string } | null;
    working_hours?: number | null;
  }>;
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
        updateSource: 'work_order'
      });
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsUpdating(false);
    setNewHours('');
  };

  return (
    <div className="mt-3 p-3 bg-muted/30 rounded-md border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Working Hours</span>
        </div>
        {!isUpdating && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUpdateClick}
            className="h-7 px-2"
          >
            <Edit className="h-3 w-3 mr-1" />
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
            placeholder="Enter working hours"
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
          Current: {currentHours ? `${currentHours} hours` : 'Not recorded'}
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

  // Handler for when equipment is created via quick entry
  const handleEquipmentCreated = (equipmentId: string) => {
    setValue('equipmentId', equipmentId);
    setMode('select'); // Switch back to select mode to show the new equipment
    onEquipmentCreated?.(equipmentId);
  };

  // If equipment is pre-selected (e.g., creating WO from equipment detail page), show read-only view
  if (isEquipmentPreSelected) {
    const equipment = preSelectedEquipment;
    if (!equipment) return null;

    const locationDisplay = equipment.last_known_location?.name || equipment.location || 'Unknown location';
    
    return (
      <div className="space-y-2">
        <Label>Equipment</Label>
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border">
          <Forklift className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
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
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {isEditMode ? 'Current' : 'Selected'}
          </Badge>
        </div>
        <WorkingHoursSection equipmentId={equipment.id} setValue={setValue} />
      </div>
    );
  }

  // Show tabs only if user can create equipment
  const showCreateOption = canCreateEquipment && canCreateEquipmentForTeam && !isEditMode;

  return (
    <div className="space-y-3">
      <Label>Equipment *</Label>
      
      {/* Mode Toggle - only show if user can create equipment */}
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

      {/* Select Existing Mode */}
      {mode === 'select' && (
        <div className="space-y-2">
          <Select 
            value={values.equipmentId} 
            onValueChange={(value) => setValue('equipmentId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select equipment" />
            </SelectTrigger>
            <SelectContent>
              {allEquipment.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  No equipment available
                </SelectItem>
              ) : (
                allEquipment.map((equipment) => {
                  const locationDisplay = equipment.last_known_location?.name || equipment.location || 'Unknown location';
                  return (
                    <SelectItem key={equipment.id} value={equipment.id}>
                      <div className="flex flex-col gap-0.5 py-1">
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
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
          {errors.equipmentId && (
            <p className="text-sm text-destructive">{errors.equipmentId}</p>
          )}
          {values.equipmentId && (
            <WorkingHoursSection equipmentId={values.equipmentId} setValue={setValue} />
          )}
        </div>
      )}

      {/* Create New Mode */}
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
