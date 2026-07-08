import React from 'react';
import { Timer } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { InlineEditPMSchedule } from './InlineEditPMSchedule';
import { mobileInlineEditIconRowClassName } from './inlineEditStyles';

type Equipment = Tables<'equipment'>;

export interface EquipmentPMConfigFieldsProps {
  equipment: Equipment;
  canEdit: boolean;
  getCurrentTeamDisplay: () => string;
}

// The PM template selector moved to the top of the Work Orders tab (#1169);
// this card keeps the schedule configuration only.
export function EquipmentPMConfigFields({
  equipment,
  canEdit,
  getCurrentTeamDisplay,
}: EquipmentPMConfigFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <span className="text-sm font-medium text-muted-foreground">PM Schedule</span>
        <div className={mobileInlineEditIconRowClassName}>
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
