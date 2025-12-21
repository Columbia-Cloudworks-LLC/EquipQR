import { describe, it, expect } from 'vitest';
import { getSimplifiedOrganizationRestrictions, getRestrictionMessage } from '../simplifiedOrganizationRestrictions';

describe('simplifiedOrganizationRestrictions', () => {
  describe('getSimplifiedOrganizationRestrictions', () => {
    it('should return all features enabled (billing permanently disabled)', () => {
      const restrictions = getSimplifiedOrganizationRestrictions();
      
      expect(restrictions.canManageTeams).toBe(true);
      expect(restrictions.canAssignEquipmentToTeams).toBe(true);
      expect(restrictions.canUploadImages).toBe(true);
      expect(restrictions.canAccessFleetMap).toBe(true);
      expect(restrictions.canInviteMembers).toBe(true);
      expect(restrictions.canCreateCustomPMTemplates).toBe(true);
      expect(restrictions.hasAvailableSlots).toBe(true);
      expect(restrictions.upgradeMessage).toBe('');
    });

    it('should always return the same result (no parameters)', () => {
      const result1 = getSimplifiedOrganizationRestrictions();
      const result2 = getSimplifiedOrganizationRestrictions();
      
      expect(result1).toEqual(result2);
    });
  });

  describe('getRestrictionMessage', () => {
    it('should return message for canManageTeams', () => {
      expect(getRestrictionMessage('canManageTeams')).toContain('Team management');
      expect(getRestrictionMessage('canManageTeams')).toContain('user licenses');
    });

    it('should return message for canAssignEquipmentToTeams', () => {
      expect(getRestrictionMessage('canAssignEquipmentToTeams')).toContain('Equipment team assignment');
    });

    it('should return message for canUploadImages', () => {
      expect(getRestrictionMessage('canUploadImages')).toContain('Image uploads');
    });

    it('should return message for canAccessFleetMap', () => {
      expect(getRestrictionMessage('canAccessFleetMap')).toContain('Fleet Map');
      expect(getRestrictionMessage('canAccessFleetMap')).toContain('premium');
    });

    it('should return message for canInviteMembers', () => {
      expect(getRestrictionMessage('canInviteMembers')).toContain('licenses');
    });

    it('should return message for canCreateCustomPMTemplates', () => {
      expect(getRestrictionMessage('canCreateCustomPMTemplates')).toContain('Custom PM templates');
    });

    it('should return message for hasAvailableSlots', () => {
      expect(getRestrictionMessage('hasAvailableSlots')).toContain('No available user licenses');
    });

    it('should return message for upgradeMessage', () => {
      expect(getRestrictionMessage('upgradeMessage')).toContain('Purchase licenses');
    });
  });
});

