import { describe, it, expect } from 'vitest';
import { createValidationContext } from './validationHelpers';

describe('validationHelpers', () => {
  describe('createValidationContext', () => {
    it('should create validation context correctly', () => {
      const context = createValidationContext(
        'admin',
        true,
        [{ team_id: 'team-1', role: 'manager' }]
      );

      expect(context.userRole).toBe('admin');
      expect(context.isOrgAdmin).toBe(true);
      expect(context.teamMemberships).toHaveLength(1);
      expect(context.teamMemberships[0].teamId).toBe('team-1');
    });
  });
});
