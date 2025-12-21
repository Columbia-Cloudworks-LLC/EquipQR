import React, { useState } from 'react';
import { Package, Clock, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { useEquipmentCurrentWorkingHours, useUpdateEquipmentWorkingHours } from '@/features/equipment/hooks/useEquipmentWorkingHours';

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
  };
  allEquipment: Array<{ 
    id: string; 
    name: string; 
    manufacturer?: string | null; 
    model?: string | null; 
    location?: string | null;
  }>;
  isEditMode: boolean;
  isEquipmentPreSelected: boolean;
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
  isEquipmentPreSelected
}) => {
  if (isEquipmentPreSelected) {
    const equipment = preSelectedEquipment;
    if (!equipment) return null;

    return (
      <div className="space-y-2">
        <Label>Equipment</Label>
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">{equipment.name}</div>
            <div className="text-sm text-muted-foreground">
              {equipment.manufacturer || ''} {equipment.model || ''} • {equipment.serial_number || ''}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {isEditMode ? 'Current' : 'Selected'}
          </Badge>
        </div>
        <WorkingHoursSection equipmentId={equipment.id} setValue={setValue} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Equipment *</Label>
      <Select 
        value={values.equipmentId} 
        onValueChange={(value) => setValue('equipmentId', value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select equipment" />
        </SelectTrigger>
        <SelectContent>
          {allEquipment.map((equipment) => (
            <SelectItem key={equipment.id} value={equipment.id}>
              <div className="flex flex-col">
                <span>{equipment.name}</span>
                <span className="text-xs text-muted-foreground">
                  {equipment.manufacturer || ''} {equipment.model || ''} • {equipment.location || ''}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.equipmentId && (
        <p className="text-sm text-destructive">{errors.equipmentId}</p>
      )}
      {values.equipmentId && (
        <WorkingHoursSection equipmentId={values.equipmentId} setValue={setValue} />
      )}
    </div>
  );
};

