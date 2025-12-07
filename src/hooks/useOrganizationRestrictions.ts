
import { useOrganizationMembers } from './useOrganizationMembers';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getOrganizationRestrictions, getRestrictionMessage } from '@/utils/organizationRestrictions';

export const useOrganizationRestrictions = () => {
  const { currentOrganization } = useOrganization();
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id || '');

  const restrictions = getOrganizationRestrictions(members);

  const getUpgradeMessage = () => {
    return '';
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
    isFreeOrganization: false, // All organizations have full access
    canUpgrade: false // No upgrades needed
  };
};
