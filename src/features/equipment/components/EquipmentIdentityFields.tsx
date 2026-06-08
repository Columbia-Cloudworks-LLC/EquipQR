import React from 'react';
import { Timer, Wrench } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import InlineEditField from './InlineEditField';
import { InlineEditPMSchedule } from './InlineEditPMSchedule';

type Equipment = Tables<'equipment'>;

type SelectOption = { value: string; label: string };

export interface EquipmentIdentityFieldsProps {
  equipment: Equipment;
  canEdit: boolean;
  manufacturerFieldId: string;
  modelFieldId: string;
  serialNumberFieldId: string;
  pmTemplateFieldId: string;
  pmTemplateOptions: SelectOption[];
  onFieldUpdate: (field: keyof Equipment, value: string) => void | Promise<void>;
  onPMTemplateAssignment: (templateId: string) => void | Promise<void>;
  getCurrentPMTemplateDisplay: () => string;
  getCurrentTeamDisplay: () => string;
}

export const EquipmentIdentityFields: React.FC<EquipmentIdentityFieldsProps> = ({
  equipment,
  canEdit,
  manufacturerFieldId,
  modelFieldId,
  serialNumberFieldId,
  pmTemplateFieldId,
  pmTemplateOptions,
  onFieldUpdate,
  onPMTemplateAssignment,
  getCurrentPMTemplateDisplay,
  getCurrentTeamDisplay,
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

    <div>
      <label htmlFor={pmTemplateFieldId} className="text-sm font-medium text-muted-foreground">
        PM Template
      </label>
      <div className="mt-1 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        {canEdit ? (
          <InlineEditField
            value={equipment.default_pm_template_id || 'none'}
            onSave={onPMTemplateAssignment}
            canEdit={canEdit}
            fieldId={pmTemplateFieldId}
            type="select"
            selectOptions={pmTemplateOptions}
            placeholder="Select PM template"
            className="text-base"
            editAriaLabel="Edit PM template"
          />
        ) : (
          <span className="text-base text-foreground">{getCurrentPMTemplateDisplay()}</span>
        )}
      </div>
    </div>

    <div>
      <span className="text-sm font-medium text-muted-foreground">PM Schedule</span>
      <div className="group mt-1 flex items-start gap-2">
        <Timer className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
        <InlineEditPMSchedule
          equipmentId={equipment.id}
          organizationId={equipment.organization_id}
          teamName={getCurrentTeamDisplay()}
          canEdit={canEdit}
        />
      </div>
    </div>
  </>
);
