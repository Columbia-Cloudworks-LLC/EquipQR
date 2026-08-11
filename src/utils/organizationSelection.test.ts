import { describe, expect, it, beforeEach } from 'vitest';
import {
  DASHBOARD_CURRENT_ORG_STORAGE_KEY,
  persistDashboardOrganizationSelection,
} from '@/utils/organizationSelection';

describe('persistDashboardOrganizationSelection', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('equipqr:cookie-consent', 'accepted');
  });

  it('writes invited org to dashboard and session preference storage', () => {
    persistDashboardOrganizationSelection('org-invited');

    expect(localStorage.getItem(DASHBOARD_CURRENT_ORG_STORAGE_KEY)).toBe('org-invited');
    expect(localStorage.getItem('equipqr_current_org')).toContain('org-invited');
  });
});
