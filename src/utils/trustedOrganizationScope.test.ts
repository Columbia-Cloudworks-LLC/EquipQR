import { describe, it, expect } from 'vitest';
import {
  mergeAllowedOrganizationIds,
  resolveValidatedOrganizationId,
} from './trustedOrganizationScope';

describe('trustedOrganizationScope', () => {
  it('returns undefined when candidate is not in allowed org ids', () => {
    expect(
      resolveValidatedOrganizationId({
        sessionOrganizationId: 'org-a',
        allowedOrganizationIds: ['org-b'],
      }),
    ).toBeUndefined();
  });

  it('prefers current org over session and persisted ids when validated', () => {
    expect(
      resolveValidatedOrganizationId({
        currentOrganizationId: 'org-current',
        sessionOrganizationId: 'org-session',
        persistedOrganizationId: 'org-persisted',
        allowedOrganizationIds: ['org-current', 'org-session', 'org-persisted'],
      }),
    ).toBe('org-current');
  });

  it('merges allowed org id lists uniquely', () => {
    expect(mergeAllowedOrganizationIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });
});
