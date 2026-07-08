import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

interface EquipmentPMTemplateCardProps {
  equipment: Equipment;
}

/**
 * Prominent PM template selector at the top of the equipment Work Orders tab
 * (#1169). The dropdown stays locked until the user explicitly clicks the
 * edit control so the template cannot be changed by accident; picking an
 * option saves immediately and re-locks the control.
 */
const EquipmentPMTemplateCard: React.FC<EquipmentPMTemplateCardProps> = ({ equipment }) => {
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
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Label htmlFor={fieldId} className="flex items-center gap-2 text-sm font-semibold">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              PM Template
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Default checklist applied when creating PM work orders for this equipment.
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:w-80">
            <Select
              value={currentValue}
              onValueChange={handleValueChange}
              disabled={!isUnlocked || isSaving}
            >
              <SelectTrigger id={fieldId} className="w-full" aria-label="PM Template">
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
      </CardContent>
    </Card>
  );
};

export default EquipmentPMTemplateCard;
