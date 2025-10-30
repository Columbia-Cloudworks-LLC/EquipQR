
import { RealOrganizationMember } from '@/hooks/useOrganizationMembers';
import { isFreeOrganization } from './billing';
import { isBillingDisabled } from '@/lib/flags';

export interface OrganizationRestrictions {
  canManageTeams: boolean;
  canAssignEquipmentToTeams: boolean;
  canUploadImages: boolean;
  canAccessFleetMap: boolean;
  canInviteMembers: boolean;
  maxMembers: number;
  maxStorage: number; // in GB
}

export const getOrganizationRestrictions = (
  members: RealOrganizationMember[],
  fleetMapEnabled: boolean = false
): OrganizationRestrictions => {
  // Billing is disabled - grant all features to all organizations
  if (isBillingDisabled()) {
    return {
      canManageTeams: true,
      canAssignEquipmentToTeams: true,
      canUploadImages: true,
      canAccessFleetMap: true, // Always allow fleet map access
      canInviteMembers: true,
      maxMembers: 1000, // Unlimited for free users
      maxStorage: 1000 // Large storage limit
    };
  }
  
  const isFree = isFreeOrganization(members);
  
  if (isFree) {
    return {
      canManageTeams: false,
      canAssignEquipmentToTeams: false,
      canUploadImages: false,
      canAccessFleetMap: false,
      canInviteMembers: false,
      maxMembers: 1,
      maxStorage: 0 // No storage for free single-user organizations
    };
  }
  
  // Paid organization (2+ users)
  return {
    canManageTeams: true,
    canAssignEquipmentToTeams: true,
    canUploadImages: true,
    canAccessFleetMap: true, // Always allow fleet map access
    canInviteMembers: true,
    maxMembers: 1000, // Large number for paid plans
    maxStorage: 5 + (members.length * 5) // 5GB base + 5GB per user
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
