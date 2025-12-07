
import { RealOrganizationMember } from '@/hooks/useOrganizationMembers';

export interface OrganizationRestrictions {
  canManageTeams: boolean;
  canAssignEquipmentToTeams: boolean;
  canUploadImages: boolean;
  canAccessFleetMap: boolean;
  canInviteMembers: boolean;
  maxMembers: number;
  maxStorage: number; // in GB
}

/**
 * Get organization restrictions - billing is permanently disabled, so all features are enabled
 */
export const getOrganizationRestrictions = (
  _members: RealOrganizationMember[]
): OrganizationRestrictions => {
  // Billing is permanently disabled - grant all features to all organizations
  return {
    canManageTeams: true,
    canAssignEquipmentToTeams: true,
    canUploadImages: true,
    canAccessFleetMap: true,
    canInviteMembers: true,
    maxMembers: 1000, // Unlimited for all users
    maxStorage: 1000 // Large storage limit
  };
};

export const getRestrictionMessage = (restriction: keyof OrganizationRestrictions): string => {
  const messages = {
    canManageTeams: 'Team management is only available for organizations with multiple users. Invite team members to unlock this feature.',
    canAssignEquipmentToTeams: 'Equipment team assignment is only available for organizations with multiple users. Invite team members to unlock this feature.',
    canUploadImages: 'Image uploads are only available for organizations with multiple users. Invite team members to unlock this feature.',
    canAccessFleetMap: 'Fleet Map is a premium add-on. Enable it from your billing settings.',
    canInviteMembers: 'This organization can invite additional members.',
    maxMembers: 'Maximum member limit reached for your current plan.',
    maxStorage: 'Storage limit reached for your current plan.'
  };
  
  return messages[restriction] || 'This feature is not available for your current plan.';
};
