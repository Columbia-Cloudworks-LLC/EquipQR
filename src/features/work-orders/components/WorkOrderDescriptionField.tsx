import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';

interface WorkOrderDescriptionFieldProps {
  values: WorkOrderFormData;
  errors: Record<string, string>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
  preSelectedEquipment?: {
    id?: string;
    name?: string;
  } | null;
}

export const WorkOrderDescriptionField: React.FC<WorkOrderDescriptionFieldProps> = ({
  values,
  errors,
  setValue,
  preSelectedEquipment
}) => {
  return (
    <div className="space-y-2">
      <Label>Description *</Label>
      <Textarea
        placeholder={preSelectedEquipment ? 
          `Describe the work needed for ${preSelectedEquipment.name}. Include any specific requirements, safety considerations, or special instructions...` :
          "Provide detailed information about the work needed, including any specific requirements, safety considerations, or special instructions..."
        }
        className="min-h-[120px]"
        value={values.description || ''}
        onChange={(e) => setValue('description', e.target.value)}
      />
      {errors.description && (
        <p className="text-sm text-destructive">{errors.description}</p>
      )}
    </div>
  );
};

