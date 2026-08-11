import { describe, expect, it } from 'vitest';
import { getPMSchedulePolicyDisplay } from '@/features/pm-templates/services/pmIntervalPolicyService';

describe('getPMSchedulePolicyDisplay', () => {
  it('shows equipment overrides with schedule first', () => {
    expect(getPMSchedulePolicyDisplay(null, { teamName: 'Rental Fleet Team' })).toEqual({
      primary: 'Inherited schedule',
      secondary: 'Inherits from team (Rental Fleet Team)',
    });

    expect(
      getPMSchedulePolicyDisplay({
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
    ).toEqual({
      primary: 'Every 30 days',
      secondary: 'Equipment override',
    });

    expect(
      getPMSchedulePolicyDisplay({
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
    ).toEqual({
      primary: 'No recurring PM',
      secondary: 'Equipment override',
    });
  });

  it('shows inherited schedule first with source underneath', () => {
    expect(
      getPMSchedulePolicyDisplay(null, {
        teamName: 'Rental Fleet Team',
        inheritedEffective: {
          scheduleMode: 'custom',
          intervalValue: 500,
          intervalType: 'hours',
          source: 'team_policy',
        },
      })
    ).toEqual({
      primary: 'Every 500 hours',
      secondary: 'From team (Rental Fleet Team)',
    });

    expect(
      getPMSchedulePolicyDisplay(null, {
        teamName: 'Rental Fleet Team',
        inheritedEffectiveLoading: true,
      })
    ).toEqual({
      primary: 'Loading…',
      secondary: null,
    });
  });

  it('distinguishes explicit none from unconfigured inheritance', () => {
    expect(
      getPMSchedulePolicyDisplay(null, {
        teamName: 'Rental Fleet Team',
        inheritedEffective: {
          scheduleMode: 'none',
          intervalValue: null,
          intervalType: null,
          source: 'team_policy',
        },
      })
    ).toEqual({
      primary: 'No recurring PM',
      secondary: 'From team (Rental Fleet Team)',
    });

    expect(
      getPMSchedulePolicyDisplay(null, {
        teamName: 'Rental Fleet Team',
        inheritedEffective: {
          scheduleMode: 'unconfigured',
          intervalValue: null,
          intervalType: null,
          source: 'unconfigured',
        },
      })
    ).toEqual({
      primary: 'No schedule configured',
      secondary: 'Inherits from team (Rental Fleet Team)',
    });

    expect(
      getPMSchedulePolicyDisplay(null, {
        teamName: 'Rental Fleet Team',
        inheritedEffective: {
          scheduleMode: 'custom',
          intervalValue: 90,
          intervalType: 'days',
          source: 'template_default',
          templateName: 'Forklift PM',
        },
      })
    ).toEqual({
      primary: 'Every 90 days',
      secondary: 'From PM template (Forklift PM)',
    });
  });
});
