import { describe, it, expect } from 'vitest';
import { getRoleBadgeVariant } from './badgeVariants';

describe('badgeVariants', () => {
  describe('getRoleBadgeVariant', () => {
    it('should return default for owner role', () => {
      expect(getRoleBadgeVariant('owner')).toBe('default');
    });

    it('should return secondary for admin role', () => {
      expect(getRoleBadgeVariant('admin')).toBe('secondary');
    });

    it('should return outline for unknown roles', () => {
      expect(getRoleBadgeVariant('member')).toBe('outline');
      expect(getRoleBadgeVariant('user')).toBe('outline');
      expect(getRoleBadgeVariant('')).toBe('outline');
      expect(getRoleBadgeVariant('unknown')).toBe('outline');
    });
  });
});
