import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkOrderFormData } from '@/hooks/useWorkOrderForm';

interface WorkOrderSchedulingProps {
  values: Pick<WorkOrderFormData, 'dueDate' | 'estimatedHours'>;
  errors: Partial<Record<'dueDate' | 'estimatedHours', string>>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
}

export const WorkOrderScheduling: React.FC<WorkOrderSchedulingProps> = ({
  values,
  errors,
  setValue
}) => {
  const handleEstimatedHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setValue('estimatedHours', null);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setValue('estimatedHours', numValue);
      }
    }
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Scheduling
        </h3>
        
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={values.dueDate || ''}
            onChange={(e) => setValue('dueDate', e.target.value || undefined)}
          />
          {errors.dueDate && (
            <p className="text-sm text-destructive">{errors.dueDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Estimated Hours</Label>
          <Input
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g., 2.5"
            value={values.estimatedHours != null ? values.estimatedHours.toString() : ''}
            onChange={handleEstimatedHoursChange}
          />
          {errors.estimatedHours && (
            <p className="text-sm text-destructive">{errors.estimatedHours}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Optional: Estimated time to complete this work order
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

