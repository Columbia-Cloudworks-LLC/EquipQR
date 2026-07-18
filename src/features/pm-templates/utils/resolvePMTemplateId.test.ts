import { describe, expect, it } from 'vitest';
import { resolvePMTemplateId } from '@/features/pm-templates/utils/resolvePMTemplateId';

describe('resolvePMTemplateId', () => {
  it('prefers explicit template override', () => {
    expect(
      resolvePMTemplateId({
        explicitTemplateId: 'override-tpl',
        equipmentDefaultTemplateId: 'default-tpl',
      })
    ).toBe('override-tpl');
  });

  it('falls back to equipment default template', () => {
    expect(
      resolvePMTemplateId({
        explicitTemplateId: '',
        equipmentDefaultTemplateId: 'default-tpl',
      })
    ).toBe('default-tpl');
  });

  it('returns null when no template is available', () => {
    expect(
      resolvePMTemplateId({
        explicitTemplateId: null,
        equipmentDefaultTemplateId: null,
      })
    ).toBeNull();
  });
});
