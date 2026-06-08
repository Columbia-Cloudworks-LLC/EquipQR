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
}) => (
  <>
    <div>
      <label htmlFor={manufacturerFieldId} className="text-sm font-medium text-muted-foreground">
        Manufacturer
      </label>
      <div className="mt-1">
        <InlineEditField
          value={equipment.manufacturer || ''}
          onSave={(value) => onFieldUpdate('manufacturer', value)}
          canEdit={canEdit}
          fieldId={manufacturerFieldId}
          placeholder="Enter manufacturer"
          className="text-base"
          editAriaLabel="Edit manufacturer"
        />
      </div>
    </div>

    <div>
      <label htmlFor={modelFieldId} className="text-sm font-medium text-muted-foreground">
        Model
      </label>
      <div className="mt-1">
        <InlineEditField
          value={equipment.model || ''}
          onSave={(value) => onFieldUpdate('model', value)}
          canEdit={canEdit}
          fieldId={modelFieldId}
          placeholder="Enter model"
          className="text-base"
          editAriaLabel="Edit model"
        />
      </div>
    </div>

    <div>
      <label htmlFor={serialNumberFieldId} className="text-sm font-medium text-muted-foreground">
        Serial Number
      </label>
      <div className="mt-1">
        <InlineEditField
          value={equipment.serial_number || ''}
          onSave={(value) => onFieldUpdate('serial_number', value)}
          canEdit={canEdit}
          fieldId={serialNumberFieldId}
          placeholder="Enter serial number"
          className="text-base"
          editAriaLabel="Edit serial number"
        />
      </div>
    </div>
  </>
);
