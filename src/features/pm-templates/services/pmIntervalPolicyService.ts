import { supabase } from '@/integrations/supabase/client';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';

export type PMIntervalPolicyScopeType = 'equipment' | 'team' | 'template';
export type PMScheduleMode = 'custom' | 'none';
export type PMIntervalType = 'days' | 'hours';

export type PMIntervalPolicyRow = {
  id: string;
  organization_id: string;
  scope_type: PMIntervalPolicyScopeType;
  equipment_id: string | null;
  team_id: string | null;
  pm_template_id: string | null;
  policy_slot: string;
  schedule_mode: PMScheduleMode;
  interval_value: number | null;
  interval_type: PMIntervalType | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PMSchedulePolicyFormMode = 'inherit' | 'custom' | 'none';

export type PMSchedulePolicyFormState = {
  mode: PMSchedulePolicyFormMode;
  intervalValue: number | null;
  intervalType: PMIntervalType;
};

export function policyRowToFormState(
  policy: PMIntervalPolicyRow | null | undefined
): PMSchedulePolicyFormState {
  if (!policy) {
    return { mode: 'inherit', intervalValue: null, intervalType: 'days' };
  }
  if (policy.schedule_mode === 'none') {
    return { mode: 'none', intervalValue: null, intervalType: 'days' };
  }
  return {
    mode: 'custom',
    intervalValue: policy.interval_value,
    intervalType: policy.interval_type ?? 'days',
  };
}

type ScopeTarget =
  | { scopeType: 'equipment'; equipmentId: string }
  | { scopeType: 'team'; teamId: string }
  | { scopeType: 'template'; templateId: string };

function scopeFilters(target: ScopeTarget) {
  switch (target.scopeType) {
    case 'equipment':
      return { scope_type: 'equipment' as const, equipment_id: target.equipmentId };
    case 'team':
      return { scope_type: 'team' as const, team_id: target.teamId };
    case 'template':
      return { scope_type: 'template' as const, pm_template_id: target.templateId };
  }
}

export const pmIntervalPolicyService = {
  async getPolicy(
    organizationId: string,
    target: ScopeTarget
  ): Promise<PMIntervalPolicyRow | null> {
    const filters = scopeFilters(target);
    let query = supabase
      .from('pm_interval_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('policy_slot', 'default');

    if (filters.scope_type === 'equipment') {
      query = query.eq('equipment_id', filters.equipment_id);
    } else if (filters.scope_type === 'team') {
      query = query.eq('team_id', filters.team_id);
    } else {
      query = query.eq('pm_template_id', filters.pm_template_id);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return (data as PMIntervalPolicyRow | null) ?? null;
  },

  async upsertPolicy(
    organizationId: string,
    target: ScopeTarget,
    form: PMSchedulePolicyFormState
  ): Promise<PMIntervalPolicyRow | null> {
    const userId = await requireAuthUserIdFromClaims();
    const filters = scopeFilters(target);

    if (form.mode === 'inherit') {
      await this.deletePolicy(organizationId, target);
      return null;
    }

    const payload = {
      organization_id: organizationId,
      scope_type: filters.scope_type,
      equipment_id: filters.scope_type === 'equipment' ? filters.equipment_id : null,
      team_id: filters.scope_type === 'team' ? filters.team_id : null,
      pm_template_id: filters.scope_type === 'template' ? filters.pm_template_id : null,
      policy_slot: 'default',
      schedule_mode: form.mode === 'none' ? 'none' : 'custom',
      interval_value: form.mode === 'custom' ? form.intervalValue : null,
      interval_type: form.mode === 'custom' ? form.intervalType : null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    const existing = await this.getPolicy(organizationId, target);

    if (existing) {
      const { data, error } = await supabase
        .from('pm_interval_policies')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as PMIntervalPolicyRow;
    }

    const { data, error } = await supabase
      .from('pm_interval_policies')
      .insert({ ...payload, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data as PMIntervalPolicyRow;
  },

  async deletePolicy(organizationId: string, target: ScopeTarget): Promise<void> {
    const filters = scopeFilters(target);
    let query = supabase
      .from('pm_interval_policies')
      .delete()
      .eq('organization_id', organizationId)
      .eq('policy_slot', 'default');

    if (filters.scope_type === 'equipment') {
      query = query.eq('equipment_id', filters.equipment_id);
    } else if (filters.scope_type === 'team') {
      query = query.eq('team_id', filters.team_id);
    } else {
      query = query.eq('pm_template_id', filters.pm_template_id);
    }

    const { error } = await query;
    if (error) throw error;
  },
};
