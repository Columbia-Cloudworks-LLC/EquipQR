import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';

interface WorkOrderHistoricalFieldsProps {
  values: Partial<WorkOrderFormData>;
  errors: Record<string, string>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
}

export const WorkOrderHistoricalFields: React.FC<WorkOrderHistoricalFieldsProps> = ({
  values,
  errors,
  setValue
}) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <h3 className="font-medium flex items-center gap-2">
        <CalendarIcon className="h-4 w-4" />
        Historical Information
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <DateTimePicker
            date={values.historicalStartDate}
            onDateChange={(date) => setValue('historicalStartDate', date)}
            placeholder="Pick start date and time"
          />
          {errors.historicalStartDate && (
            <p className="text-sm text-destructive">{errors.historicalStartDate}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={values.status || 'accepted'}
            onValueChange={(value) => setValue('status', value as WorkOrderFormData['status'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(values.status === 'completed' || values.status === 'cancelled') && (
        <div className="space-y-2">
          <Label>Completion Date</Label>
          <DateTimePicker
            date={values.completedDate}
            onDateChange={(date) => setValue('completedDate', date)}
            placeholder="Pick completion date and time"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="historicalNotes">Historical Notes</Label>
        <Textarea
          id="historicalNotes"
          value={values.historicalNotes || ''}
          onChange={(e) => setValue('historicalNotes', e.target.value)}
          placeholder="Notes about this historical record..."
          rows={2}
        />
      </div>
    </div>
  );
};

