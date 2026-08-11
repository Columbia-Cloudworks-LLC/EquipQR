import { describe, expect, it } from 'vitest';
import { getPMScheduleSourceLabel } from '@/features/pm-templates/utils/pmScheduleSourceLabel';

describe('getPMScheduleSourceLabel', () => {
  it('maps known policy sources', () => {
    expect(getPMScheduleSourceLabel('equipment_policy')).toBe('equipment override');
    expect(getPMScheduleSourceLabel('team_policy')).toBe('team schedule');
    expect(getPMScheduleSourceLabel('template_policy')).toBe('template schedule');
    expect(getPMScheduleSourceLabel('template_default')).toBe('template default');
  });
});
