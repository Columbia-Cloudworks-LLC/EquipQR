import { RealOrganizationMember } from '@/hooks/useOrganizationMembers';
import { SlotAvailability } from '@/hooks/useOrganizationSlots';
import { isBillingDisabled } from '@/lib/flags';

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

export const getSimplifiedOrganizationRestrictions = (
  members: RealOrganizationMember[],
  slotAvailability: SlotAvailability
): SimplifiedOrganizationRestrictions => {
  // Billing is disabled - grant all features to all organizations
  if (isBillingDisabled()) {
    return {
      canManageTeams: true,
      canAssignEquipmentToTeams: true,
      canUploadImages: true,
      canAccessFleetMap: true, // Always allow fleet map access
      canInviteMembers: true,
      canCreateCustomPMTemplates: true,
      hasAvailableSlots: true,
      upgradeMessage: ''
    };
  }
  
  const activeMemberCount = members.filter(member => member.status === 'active').length;
  // Organization is free only if it has a single user AND no available slots (neither purchased nor exempted)
  const isFree = activeMemberCount === 1 && slotAvailability.available_slots === 0;
  
  // For free organizations (single user, no purchased slots)
  if (isFree) {
    return {
      canManageTeams: false,
      canAssignEquipmentToTeams: false,
      canUploadImages: false,
      canAccessFleetMap: false,
      canInviteMembers: false, // Can't invite until they purchase slots
      canCreateCustomPMTemplates: false, // Can't create custom PM templates
      hasAvailableSlots: false, // No slots purchased yet
      upgradeMessage: 'Purchase user licenses to invite team members and unlock collaboration features. Only $10/month per additional user.'
    };
  }
  
  // Multi-user organization (paid) - has purchased slots or multiple active users
  const hasAvailableSlots = slotAvailability.available_slots > 0;
  
  return {
    canManageTeams: true,
    canAssignEquipmentToTeams: true,
    canUploadImages: true,
    canAccessFleetMap: true, // Always allow fleet map access
    canInviteMembers: hasAvailableSlots,
    canCreateCustomPMTemplates: true, // Paying customers can create custom PM templates
    hasAvailableSlots,
    upgradeMessage: hasAvailableSlots ? '' : 'Purchase more user licenses to invite additional team members.'
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