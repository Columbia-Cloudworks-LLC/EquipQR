import { Label } from '@/components/ui/label';
import { Timer } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { InlineEditPMSchedule } from './InlineEditPMSchedule';
import { EquipmentPMTemplateField } from './EquipmentPMTemplateField';

type Equipment = Tables<'equipment'>;

const pmConfigHintClassName = 'mt-1 text-xs text-muted-foreground lg:min-h-[2.5rem]';
const pmConfigControlRowClassName = 'mt-2 flex min-h-10 min-w-0 items-center gap-1.5';

export interface EquipmentPMConfigFieldsProps {
  equipment: Equipment;
  canEdit: boolean;
  getCurrentTeamDisplay: () => string;
}

// Template and schedule share a two-column row on desktop (#1212).
export function EquipmentPMConfigFields({
  equipment,
  canEdit,
  getCurrentTeamDisplay,
}: EquipmentPMConfigFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 lg:items-start">
      <EquipmentPMTemplateField equipment={equipment} />

      <div className="min-w-0">
        <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Timer className="h-4 w-4 shrink-0" />
          PM Schedule
        </Label>
        <p className={pmConfigHintClassName}>
          Override the team or template default interval for this equipment.
        </p>
        <div className={pmConfigControlRowClassName}>
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
