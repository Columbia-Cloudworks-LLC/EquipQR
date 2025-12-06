import { RealOrganizationMember } from '@/hooks/useOrganizationMembers';

export interface SimplifiedOrganizationRestrictions {
  canManageTeams: boolean;
  canAssignEquipmentToTeams: boolean;
  canUploadImages: boolean;
  canAccessFleetMap: boolean;
  canInviteMembers: boolean;
  canCreateCustomPMTemplates: boolean;
  hasAvailableSlots: boolean;
  upgradeMessage: string;
}

/**
 * Get simplified organization restrictions - billing is permanently disabled, so all features are enabled
 */
export const getSimplifiedOrganizationRestrictions = (
  _members: RealOrganizationMember[],
  _fleetMapEnabled?: boolean
): SimplifiedOrganizationRestrictions => {
  // Billing is permanently disabled - grant all features to all organizations
  return {
    canManageTeams: true,
    canAssignEquipmentToTeams: true,
    canUploadImages: true,
    canAccessFleetMap: true,
    canInviteMembers: true,
    canCreateCustomPMTemplates: true,
    hasAvailableSlots: true,
    upgradeMessage: ''
  };
};

export const getRestrictionMessage = (restriction: keyof SimplifiedOrganizationRestrictions): string => {
  const messages = {
    canManageTeams: 'Team management requires user licenses. Purchase licenses to unlock collaboration features.',
    canAssignEquipmentToTeams: 'Equipment team assignment requires user licenses. Purchase licenses to unlock this feature.',
    canUploadImages: 'Image uploads require user licenses. Purchase licenses to unlock this feature.',
    canAccessFleetMap: 'Fleet Map is a premium add-on. Enable it from your billing settings.',
    canInviteMembers: 'Purchase licenses to invite team members.',
    canCreateCustomPMTemplates: 'Custom PM templates require user licenses. Purchase licenses to create and manage custom preventative maintenance checklists.',
    hasAvailableSlots: 'No available user licenses. Purchase more licenses to invite team members.',
    upgradeMessage: 'Purchase licenses to unlock collaboration features.'
  };
  
  return messages[restriction] || 'This feature requires user licenses for your organization.';
};