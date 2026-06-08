import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Edit2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PMSchedulePolicyFields } from '@/features/pm-templates/components/PMSchedulePolicyFields';
import {
  formatPMSchedulePolicyDisplay,
  policyRowToFormState,
  pmIntervalPolicyService,
  type PMIntervalPolicyRow,
  type PMSchedulePolicyFormState,
} from '@/features/pm-templates/services/pmIntervalPolicyService';
import { usePMIntervalPolicy } from '@/features/pm-templates/hooks/usePMIntervalPolicies';
import { queryKeys } from '@/lib/queryKeys';
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
  const target = { scopeType: 'equipment' as const, equipmentId };
  const { data: policy, isLoading } = usePMIntervalPolicy(organizationId, target);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<PMSchedulePolicyFormState>(policyRowToFormState(policy));
  const [intervalError, setIntervalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setForm(policyRowToFormState(policy));
    }
  }, [policy, isEditing]);

  const displayText = formatPMSchedulePolicyDisplay(policy, { teamName });

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
      queryClient.invalidateQueries({
        queryKey: queryKeys.pmStatus.byEquipment(equipmentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pmStatus.byOrg(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.equipment.pmStatus(equipmentId),
      });
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
    return <span className="text-base text-foreground">{displayText}</span>;
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 text-base">
        <span>{displayText}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
          onClick={() => setIsEditing(true)}
          disabled={isLoading}
          aria-label="Edit PM schedule"
        >
          <Edit2 className="h-3 w-3" />
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
