import { describe, it, expect } from 'vitest';
import { getOrganizationRestrictions, getRestrictionMessage } from '../organizationRestrictions';
import type { RealOrganizationMember } from '@/features/organization/hooks/useOrganizationMembers';

describe('organizationRestrictions', () => {
  describe('getOrganizationRestrictions', () => {
    it('should return all features enabled (billing permanently disabled)', () => {
      const members: RealOrganizationMember[] = [
        { 
          id: 'member-1', 
          user_id: 'user-1', 
          organization_id: 'org-1', 
          role: 'admin', 
          created_at: '2023-01-01',
          profiles: { display_name: 'Test User', email: 'test@example.com' }
        }
      ];
      
      const restrictions = getOrganizationRestrictions(members);
      
      expect(restrictions.canManageTeams).toBe(true);
      expect(restrictions.canAssignEquipmentToTeams).toBe(true);
      expect(restrictions.canUploadImages).toBe(true);
      expect(restrictions.canAccessFleetMap).toBe(true);
      expect(restrictions.canInviteMembers).toBe(true);
      expect(restrictions.maxMembers).toBe(1000);
      expect(restrictions.maxStorage).toBe(1000);
    });

    it('should return same restrictions regardless of member count', () => {
      const emptyMembers: RealOrganizationMember[] = [];
      const manyMembers: RealOrganizationMember[] = [
        { id: 'm1', user_id: 'u1', organization_id: 'org-1', role: 'admin', created_at: '2023-01-01', profiles: { display_name: 'A', email: 'a@test.com' } },
        { id: 'm2', user_id: 'u2', organization_id: 'org-1', role: 'member', created_at: '2023-01-01', profiles: { display_name: 'B', email: 'b@test.com' } },
        { id: 'm3', user_id: 'u3', organization_id: 'org-1', role: 'member', created_at: '2023-01-01', profiles: { display_name: 'C', email: 'c@test.com' } },
      ];
      
      const emptyRestrictions = getOrganizationRestrictions(emptyMembers);
      const manyRestrictions = getOrganizationRestrictions(manyMembers);
      
      expect(emptyRestrictions).toEqual(manyRestrictions);
    });
  });

  describe('getRestrictionMessage', () => {
    it('should return message for canManageTeams', () => {
      expect(getRestrictionMessage('canManageTeams')).toContain('Team management');
    });

    it('should return message for canAssignEquipmentToTeams', () => {
      expect(getRestrictionMessage('canAssignEquipmentToTeams')).toContain('Equipment team assignment');
    });

    it('should return message for canUploadImages', () => {
      expect(getRestrictionMessage('canUploadImages')).toContain('Image uploads');
    });

    it('should return message for canAccessFleetMap', () => {
      expect(getRestrictionMessage('canAccessFleetMap')).toContain('Fleet Map');
    });

    it('should return message for canInviteMembers', () => {
      expect(getRestrictionMessage('canInviteMembers')).toContain('invite');
    });

    it('should return message for maxMembers', () => {
      expect(getRestrictionMessage('maxMembers')).toContain('Maximum member limit');
    });

    it('should return message for maxStorage', () => {
      expect(getRestrictionMessage('maxStorage')).toContain('Storage limit');
    });
  });
});

