import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit2, Wrench, X } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useEquipmentPMTemplateAssignment } from '@/features/equipment/hooks/useEquipmentPMTemplateAssignment';

type Equipment = Tables<'equipment'>;

interface EquipmentPMTemplateFieldProps {
  equipment: Equipment;
}

/**
 * Lock-to-edit PM template selector. Lives inside Preventative Maintenance
 * config (#1212), directly above the PM schedule field.
 */
export function EquipmentPMTemplateField({ equipment }: EquipmentPMTemplateFieldProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const permissions = useUnifiedPermissions();
  const canEdit = permissions.equipment.getPermissions(equipment.team_id || undefined).canEdit;

  const {
    pmTemplateOptions,
    handlePMTemplateAssignment,
    isSaving,
  } = useEquipmentPMTemplateAssignment(equipment, { canEdit });

  const fieldId = `equipment-pm-template-${equipment.id}`;
  const currentValue = equipment.default_pm_template_id || 'none';

  const handleValueChange = async (templateId: string) => {
    if (templateId === currentValue) {
      setIsUnlocked(false);
      return;
    }
    try {
      await handlePMTemplateAssignment(templateId);
    } catch {
      // Errors are logged in the hook and toasted by the mutation layer.
    } finally {
      setIsUnlocked(false);
    }
  };

  return (
    <div className="min-w-0">
      <Label htmlFor={fieldId} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Wrench className="h-4 w-4 shrink-0" />
        PM Template
      </Label>
      <p className="mt-1 text-xs text-muted-foreground lg:min-h-[2.5rem]">
        Default checklist applied when creating PM work orders for this equipment.
      </p>
      <div className="mt-2 flex min-w-0 items-center gap-1.5">
        <Select
          value={currentValue}
          onValueChange={handleValueChange}
          disabled={!isUnlocked || isSaving}
        >
          <SelectTrigger id={fieldId} className="w-full min-w-0" aria-label="PM Template">
            <SelectValue placeholder="Select PM template" />
          </SelectTrigger>
          <SelectContent>
            {pmTemplateOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canEdit && !isUnlocked && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            onClick={() => setIsUnlocked(true)}
            aria-label="Edit PM template"
            title="Edit PM template"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}

        {canEdit && isUnlocked && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            onClick={() => setIsUnlocked(false)}
            disabled={isSaving}
            aria-label="Cancel PM template edit"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
