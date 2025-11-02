
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { WorkOrderFormData } from '@/hooks/useWorkOrderForm';

interface WorkOrderBasicFieldsProps {
  values: WorkOrderFormData;
  errors: Record<string, string>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
  preSelectedEquipment?: {
    id?: string;
    name?: string;
  } | null;
}

export const WorkOrderBasicFields: React.FC<WorkOrderBasicFieldsProps> = ({
  values,
  errors,
  setValue,
  preSelectedEquipment
}) => {
  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Work Order Details
        </h3>
        
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            placeholder={preSelectedEquipment ? 
              `Maintenance for ${preSelectedEquipment.name}` : 
              "Brief description of the work needed"
            }
            value={values.title || ''}
            onChange={(e) => setValue('title', e.target.value)}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Priority *</Label>
          <Select 
            value={values.priority} 
            onValueChange={(value) => setValue('priority', value as WorkOrderFormData['priority'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Low Priority
                </div>
              </SelectItem>
              <SelectItem value="medium">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  Medium Priority
                </div>
              </SelectItem>
              <SelectItem value="high">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  High Priority
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.priority && (
            <p className="text-sm text-destructive">{errors.priority}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={values.dueDate || ''}
            onChange={(e) => setValue('dueDate', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
