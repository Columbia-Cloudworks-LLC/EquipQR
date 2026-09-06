import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  applyDueWrite,
  dueDateTimeInputWrite,
  dueDayInputValue,
  dueDayInputWrite,
  dueTimeInputValue,
  parseCalendarDay,
  parseDue,
  persistDue,
} from '@/features/work-orders/calendar';
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';

interface WorkOrderSchedulingProps {
  values: Pick<WorkOrderFormData, 'dueDate' | 'dueDateHasTime' | 'estimatedHours'>;
  errors: Partial<Record<'dueDate' | 'estimatedHours', string>>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
}

export const WorkOrderScheduling: React.FC<WorkOrderSchedulingProps> = ({
  values,
  errors,
  setValue
}) => {
  const due = parseDue({
    dueDate: values.dueDate,
    dueDateHasTime: values.dueDateHasTime ?? false,
  });

  const persistWrite = (write: Parameters<typeof applyDueWrite>[1]) => {
    const persisted = persistDue(applyDueWrite(due, write));
    setValue('dueDate', persisted.dueDate ?? undefined);
    setValue('dueDateHasTime', persisted.dueDateHasTime);
  };

  const handleDueTimeChange = (raw: string) => {
    if (raw === '') {
      persistWrite(dueDateTimeInputWrite(null));
      return;
    }

    const day = parseCalendarDay(dueDayInputValue(due));
    if (!day) return;

    const [hours, minutes] = raw.split(':').map(Number);
    persistWrite(dueDateTimeInputWrite({
      epochMs: new Date(day.y, day.m - 1, day.d, hours, minutes, 0, 0).getTime(),
    }));
  };

  const handleEstimatedHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setValue('estimatedHours', null);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 10000) {
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
          <Label htmlFor="work-order-due-date">Due Date</Label>
          <Input
            id="work-order-due-date"
            type="date"
            value={dueDayInputValue(due)}
            onChange={(e) => persistWrite(dueDayInputWrite(due, e.target.value))}
          />
          {errors.dueDate && (
            <p className="text-sm text-destructive">{errors.dueDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="work-order-due-time">Due time</Label>
          <Input
            id="work-order-due-time"
            type="time"
            value={dueTimeInputValue(due)}
            onChange={(e) => handleDueTimeChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional. Leave empty for an all-day due date.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="work-order-estimated-hours">Estimated Hours</Label>
          <Input
            id="work-order-estimated-hours"
            type="number"
            min="0"
            max="10000"
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
