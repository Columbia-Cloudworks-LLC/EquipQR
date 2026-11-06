import { describe, expect, it } from 'vitest';
import { organizationFormSchema } from './organizationSettingsSchema';

function messages(input: Record<string, unknown>): string[] {
  const result = organizationFormSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe('organizationFormSchema', () => {
  it('accepts a name with optional color and scan-location setting', () => {
    expect(organizationFormSchema.parse({ name: 'Acme', backgroundColor: '#112233', scan_location_collection_enabled: true }))
      .toEqual({ name: 'Acme', backgroundColor: '#112233', scan_location_collection_enabled: true });
    expect(messages({ name: 'Acme' })).toEqual([]);
  });

  it('requires a name of 1 to 100 characters', () => {
    expect(messages({ name: '' })).toEqual(['Organization name is required']);
    expect(messages({ name: 'x'.repeat(101) })).toEqual(['Name must be less than 100 characters']);
    expect(messages({ name: 'x'.repeat(100) })).toEqual([]);
  });

  it('rejects a non-boolean scan-location setting', () => {
    expect(messages({ name: 'Acme', scan_location_collection_enabled: 'yes' })).toHaveLength(1);
  });
});
