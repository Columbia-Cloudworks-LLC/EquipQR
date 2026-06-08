import { describe, expect, it } from 'vitest';
import { formatPMSchedulePolicyDisplay } from '@/features/pm-templates/services/pmIntervalPolicyService';

describe('formatPMSchedulePolicyDisplay', () => {
  it('describes inherit, custom, and none policies', () => {
    expect(formatPMSchedulePolicyDisplay(null, { teamName: 'Rental Fleet Team' })).toBe(
      'Inherits from team (Rental Fleet Team)'
    );
    expect(
      formatPMSchedulePolicyDisplay({
        id: 'p1',
        organization_id: 'org',
        scope_type: 'equipment',
        equipment_id: 'eq',
        team_id: null,
        pm_template_id: null,
        policy_slot: 'default',
        schedule_mode: 'custom',
        interval_value: 30,
        interval_type: 'days',
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      })
    ).toBe('Every 30 days');
    expect(
      formatPMSchedulePolicyDisplay({
        id: 'p2',
        organization_id: 'org',
        scope_type: 'equipment',
        equipment_id: 'eq',
        team_id: null,
        pm_template_id: null,
        policy_slot: 'default',
        schedule_mode: 'none',
        interval_value: null,
        interval_type: null,
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      })
    ).toBe('No recurring PM');
  });
});
