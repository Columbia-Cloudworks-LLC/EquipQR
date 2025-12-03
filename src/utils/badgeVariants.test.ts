import { describe, it, expect } from 'vitest';
import { getRoleBadgeVariant, getStatusBadgeVariant } from './badgeVariants';

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

  describe('getStatusBadgeVariant', () => {
    it('should return default for active status', () => {
      expect(getStatusBadgeVariant('active')).toBe('default');
    });

    it('should return secondary for pending status', () => {
      expect(getStatusBadgeVariant('pending')).toBe('secondary');
    });

    it('should return destructive for other statuses', () => {
      expect(getStatusBadgeVariant('inactive')).toBe('destructive');
      expect(getStatusBadgeVariant('cancelled')).toBe('destructive');
      expect(getStatusBadgeVariant('suspended')).toBe('destructive');
      expect(getStatusBadgeVariant('')).toBe('destructive');
      expect(getStatusBadgeVariant('unknown')).toBe('destructive');
    });
  });
});
