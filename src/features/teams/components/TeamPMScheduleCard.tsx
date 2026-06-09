import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer } from 'lucide-react';
import {
  usePMIntervalPolicy,
} from '@/features/pm-templates/hooks/usePMIntervalPolicies';
import { policyRowToFormState } from '@/features/pm-templates/services/pmIntervalPolicyService';

type TeamPMScheduleCardProps = {
  organizationId: string;
  teamId: string;
};

export function TeamPMScheduleCard({ organizationId, teamId }: TeamPMScheduleCardProps) {
  const { data: policy, isLoading } = usePMIntervalPolicy(
    organizationId,
    { scopeType: 'team', teamId }
  );
  const form = policyRowToFormState(policy);

  const summary = isLoading
    ? 'Loading PM schedule...'
    : form.mode === 'none'
      ? 'No recurring PM for equipment on this team unless overridden per asset.'
      : form.mode === 'custom'
        ? `Custom team interval: every ${form.intervalValue} ${form.intervalType === 'hours' ? 'working hours' : 'calendar days'}`
        : 'No team override: equipment uses its PM template schedule unless overridden per asset.';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4" />
          PM Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{summary}</p>
      </CardContent>
    </Card>
  );
}
