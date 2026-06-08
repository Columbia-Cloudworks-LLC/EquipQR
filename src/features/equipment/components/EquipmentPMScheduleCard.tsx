import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer } from 'lucide-react';
import { PMSchedulePolicyFields } from '@/features/pm-templates/components/PMSchedulePolicyFields';
import {
  policyRowToFormState,
  type PMSchedulePolicyFormState,
} from '@/features/pm-templates/services/pmIntervalPolicyService';
import {
  usePMIntervalPolicy,
  useUpsertPMIntervalPolicy,
} from '@/features/pm-templates/hooks/usePMIntervalPolicies';
import { useEquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { getPMScheduleSourceLabel } from '@/features/pm-templates/utils/pmScheduleSourceLabel';

type EquipmentPMScheduleCardProps = {
  equipmentId: string;
  organizationId: string;
  teamName?: string | null;
  canEdit: boolean;
};

export function EquipmentPMScheduleCard({
  equipmentId,
  organizationId,
  teamName,
  canEdit,
}: EquipmentPMScheduleCardProps) {
  const target = { scopeType: 'equipment' as const, equipmentId };
  const { data: policy, isLoading } = usePMIntervalPolicy(organizationId, target);
  const { data: pmStatus } = useEquipmentPMStatus(equipmentId);
  const upsertPolicy = useUpsertPMIntervalPolicy(organizationId);
  const [form, setForm] = useState<PMSchedulePolicyFormState>(policyRowToFormState(policy));
  const [intervalError, setIntervalError] = useState<string | null>(null);

  useEffect(() => {
    setForm(policyRowToFormState(policy));
  }, [policy]);

  const handleSave = async () => {
    if (form.mode === 'custom' && (!form.intervalValue || form.intervalValue < 1)) {
      setIntervalError('Enter a value of 1 or greater');
      return;
    }
    setIntervalError(null);
    await upsertPolicy.mutateAsync({ target, form });
  };

  const effectiveLabel = pmStatus
    ? `Effective: every ${pmStatus.interval_value} ${pmStatus.interval_type === 'hours' ? 'hrs' : 'days'} (${getPMScheduleSourceLabel(pmStatus.source)})`
    : policy?.schedule_mode === 'none'
      ? 'No recurring PM schedule applies to this equipment.'
      : 'No PM schedule is active until a completed PM exists with a configured interval.';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4" />
          PM Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{effectiveLabel}</p>

        {canEdit ? (
          <>
            <PMSchedulePolicyFields
              value={form}
              onChange={setForm}
              inheritLabel={teamName ? `Inherit from team (${teamName})` : 'Inherit from team or template'}
              intervalError={intervalError}
              disabled={isLoading || upsertPolicy.isPending}
            />
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={isLoading || upsertPolicy.isPending}
            >
              Save PM Schedule
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {policy
              ? policy.schedule_mode === 'none'
                ? 'This equipment is configured for no recurring PM.'
                : `Custom interval: every ${policy.interval_value} ${policy.interval_type === 'hours' ? 'hrs' : 'days'}`
              : 'Inherits schedule from team or template.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
