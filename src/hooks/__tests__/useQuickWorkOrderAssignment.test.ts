import { describe, expect, it } from 'vitest';
import { resolveStatusAfterAssignment } from '@/hooks/useQuickWorkOrderAssignment';

describe('resolveStatusAfterAssignment', () => {
  it('preserves in_progress when reassigning', () => {
    expect(resolveStatusAfterAssignment('in_progress', 'user-2')).toBe('in_progress');
  });

  it('preserves on_hold when reassigning', () => {
    expect(resolveStatusAfterAssignment('on_hold', 'user-2')).toBe('on_hold');
  });

  it('moves accepted to assigned when assigning', () => {
    expect(resolveStatusAfterAssignment('accepted', 'user-2')).toBe('assigned');
  });

  it('moves assigned to accepted when unassigning', () => {
    expect(resolveStatusAfterAssignment('assigned', null)).toBe('accepted');
  });

  it('moves in_progress to accepted when unassigning', () => {
    expect(resolveStatusAfterAssignment('in_progress', null)).toBe('accepted');
  });
});
