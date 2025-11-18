
import { useOrganizationMembers } from './useOrganizationMembers';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getOrganizationRestrictions, getRestrictionMessage } from '@/utils/organizationRestrictions';

export const useOrganizationRestrictions = (fleetMapEnabled: boolean = false) => {
  const { currentOrganization } = useOrganization();
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id || '');

  const restrictions = getOrganizationRestrictions(members, fleetMapEnabled);

  const getUpgradeMessage = () => {
    return 'Invite team members to unlock team management, equipment assignment, image uploads, storage, and premium add-ons.';
  };

  const checkRestriction = (restriction: keyof typeof restrictions) => {
    return {
      allowed: restrictions[restriction],
      message: restrictions[restriction] ? '' : getRestrictionMessage(restriction),
      upgradeMessage: getUpgradeMessage()
    };
  };

  return {
    restrictions,
    checkRestriction,
    getRestrictionMessage,
    getUpgradeMessage,
    isFreeOrganization: !restrictions.canInviteMembers,
    canUpgrade: !restrictions.canInviteMembers
  };
};
