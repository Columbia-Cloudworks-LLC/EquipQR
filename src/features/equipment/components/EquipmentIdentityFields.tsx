import React from 'react';
import { Tables } from '@/integrations/supabase/types';
import InlineEditField from './InlineEditField';

type Equipment = Tables<'equipment'>;

export interface EquipmentIdentityFieldsProps {
  equipment: Equipment;
  canEdit: boolean;
  manufacturerFieldId: string;
  modelFieldId: string;
  serialNumberFieldId: string;
  onFieldUpdate: (field: keyof Equipment, value: string) => void | Promise<void>;
}

export const EquipmentIdentityFields: React.FC<EquipmentIdentityFieldsProps> = ({
  equipment,
  canEdit,
  manufacturerFieldId,
  modelFieldId,
  serialNumberFieldId,
  onFieldUpdate,
}) => {
  const saveField = async (field: keyof Equipment, value: string) => {
    await onFieldUpdate(field, value);
  };

  return (
  <>
    <div>
      <label htmlFor={manufacturerFieldId} className="text-sm font-medium text-muted-foreground">
        Manufacturer
      </label>
      <div className="mt-1 w-full">
        <InlineEditField
          value={equipment.manufacturer || ''}
          onSave={(value) => saveField('manufacturer', value)}
          canEdit={canEdit}
          fieldId={manufacturerFieldId}
          placeholder="Enter manufacturer"
          className="w-full text-base"
          editAriaLabel="Edit manufacturer"
        />
      </div>
    </div>

    <div>
      <label htmlFor={modelFieldId} className="text-sm font-medium text-muted-foreground">
        Model
      </label>
      <div className="mt-1 w-full">
        <InlineEditField
          value={equipment.model || ''}
          onSave={(value) => saveField('model', value)}
          canEdit={canEdit}
          fieldId={modelFieldId}
          placeholder="Enter model"
          className="w-full text-base"
          editAriaLabel="Edit model"
        />
      </div>
    </div>

    <div>
      <label htmlFor={serialNumberFieldId} className="text-sm font-medium text-muted-foreground">
        Serial Number
      </label>
      <div className="mt-1 w-full">
        <InlineEditField
          value={equipment.serial_number || ''}
          onSave={(value) => saveField('serial_number', value)}
          canEdit={canEdit}
          fieldId={serialNumberFieldId}
          placeholder="Enter serial number"
          className="w-full text-base"
          editAriaLabel="Edit serial number"
        />
      </div>
    </div>
  </>
  );
};
