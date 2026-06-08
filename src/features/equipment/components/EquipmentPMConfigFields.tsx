import React from 'react';
import { Timer, Wrench } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import InlineEditField from './InlineEditField';
import { InlineEditPMSchedule } from './InlineEditPMSchedule';

type Equipment = Tables<'equipment'>;

type SelectOption = { value: string; label: string };

export interface EquipmentPMConfigFieldsProps {
  equipment: Equipment;
  canEdit: boolean;
  pmTemplateFieldId: string;
  pmTemplateOptions: SelectOption[];
  onPMTemplateAssignment: (templateId: string) => void | Promise<void>;
  getCurrentPMTemplateDisplay: () => string;
  getCurrentTeamDisplay: () => string;
}

export function EquipmentPMConfigFields({
  equipment,
  canEdit,
  pmTemplateFieldId,
  pmTemplateOptions,
  onPMTemplateAssignment,
  getCurrentPMTemplateDisplay,
  getCurrentTeamDisplay,
}: EquipmentPMConfigFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  );
}
