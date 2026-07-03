import { describe, expect, it } from 'vitest';
import {
  canAccessScopedReportsExport,
  hasScopedWorkOrderExportTeamRole,
  resolveWorkOrderExportAudience,
} from './workOrderExportAccess';

describe('workOrderExportAccess', () => {
  it('treats org admin as admin audience', () => {
    expect(resolveWorkOrderExportAudience(true, [{ role: 'viewer' }])).toBe('admin');
  });

  it('treats requestor/viewer as customer-safe audience', () => {
    expect(resolveWorkOrderExportAudience(false, [{ role: 'requestor' }])).toBe('customer-safe');
    expect(resolveWorkOrderExportAudience(false, [{ role: 'viewer' }])).toBe('customer-safe');
  });

  it('denies technician-only members', () => {
    expect(resolveWorkOrderExportAudience(false, [{ role: 'technician' }])).toBe('none');
    expect(hasScopedWorkOrderExportTeamRole([{ role: 'technician' }])).toBe(false);
  });

  it('allows reports access for admin or scoped team roles', () => {
    expect(canAccessScopedReportsExport(true, [])).toBe(true);
    expect(canAccessScopedReportsExport(false, [{ role: 'viewer' }])).toBe(true);
    expect(canAccessScopedReportsExport(false, [{ role: 'manager' }])).toBe(false);
  });
});
