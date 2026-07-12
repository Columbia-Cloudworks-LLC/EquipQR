import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Edit2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  desktopHoverEditIconClassName,
  desktopInlineEditRowClassName,
  inlineEditIconClassName,
  mobileInlineEditRowClassName,
  mobileInlineEditValueClassName,
} from './inlineEditStyles';
import { useQueryClient } from '@tanstack/react-query';
import { PMSchedulePolicyFields } from '@/features/pm-templates/components/PMSchedulePolicyFields';
import {
  getPMSchedulePolicyDisplay,
  policyRowToFormState,
  pmIntervalPolicyService,
  type PMSchedulePolicyFormState,
} from '@/features/pm-templates/services/pmIntervalPolicyService';
import { PMSchedulePolicyReadout } from './PMSchedulePolicyReadout';
import {
  useEffectivePMIntervalForEquipment,
  usePMIntervalPolicy,
} from '@/features/pm-templates/hooks/usePMIntervalPolicies';
import { queryKeys } from '@/lib/queryKeys';
import { invalidatePMScheduleQueries } from '@/features/equipment/hooks/useEquipmentPMTemplateAssignment';
import { toast } from 'sonner';

type InlineEditPMScheduleProps = {
  equipmentId: string;
  organizationId: string;
  teamName?: string | null;
  canEdit: boolean;
};

export function InlineEditPMSchedule({
  equipmentId,
  organizationId,
  teamName,
  canEdit,
}: InlineEditPMScheduleProps) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const target = { scopeType: 'equipment' as const, equipmentId };
  const { data: policy, isLoading } = usePMIntervalPolicy(organizationId, target);
  const isInherit = policyRowToFormState(policy).mode === 'inherit';
  const { data: inheritedEffective, isLoading: isLoadingInheritedEffective } =
    useEffectivePMIntervalForEquipment(equipmentId, {
      enabled: isInherit,
    });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<PMSchedulePolicyFormState>(policyRowToFormState(policy));
  const [intervalError, setIntervalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setForm(policyRowToFormState(policy));
    }
  }, [policy, isEditing]);

  const display = getPMSchedulePolicyDisplay(policy, {
    teamName,
    inheritedEffective: isInherit ? inheritedEffective : undefined,
    inheritedEffectiveLoading: isInherit && isLoadingInheritedEffective,
  });

  const handleSave = async () => {
    if (form.mode === 'custom' && (!form.intervalValue || form.intervalValue < 1)) {
      setIntervalError('Enter a value of 1 or greater');
      return;
    }

    setIntervalError(null);
    setIsSaving(true);
    try {
      await pmIntervalPolicyService.upsertPolicy(organizationId, target, form);
      queryClient.invalidateQueries({
        queryKey: queryKeys.pmIntervalPolicies.byEquipment(organizationId, equipmentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pmIntervalPolicies.byOrg(organizationId),
      });
      invalidatePMScheduleQueries(queryClient, equipmentId, organizationId);
      setIsEditing(false);
    } catch {
      toast.error('Failed to update PM schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(policyRowToFormState(policy));
    setIntervalError(null);
    setIsEditing(false);
  };

  if (!canEdit) {
    return <PMSchedulePolicyReadout display={display} />;
  }

  if (!isEditing) {
    const startEdit = () => setIsEditing(true);

    return (
      <div
        className={cn(
          isMobile ? mobileInlineEditRowClassName : desktopInlineEditRowClassName,
          'min-w-0 w-full flex-1 items-center',
        )}
      >
        <div className={cn(isMobile && mobileInlineEditValueClassName, !isMobile && 'min-w-0 flex-1')}>
          <PMSchedulePolicyReadout display={display} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={isMobile ? inlineEditIconClassName : desktopHoverEditIconClassName}
          onClick={startEdit}
          disabled={isLoading}
          aria-label="Edit PM schedule"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PMSchedulePolicyFields
        value={form}
        onChange={setForm}
        inheritLabel={teamName ? `Inherit from team (${teamName})` : 'Inherit from team or template'}
        intervalError={intervalError}
        disabled={isLoading || isSaving}
        compact
      />
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => void handleSave()}
          disabled={isSaving}
          aria-label="Save PM schedule"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleCancel}
          disabled={isSaving}
          aria-label="Cancel PM schedule edit"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
