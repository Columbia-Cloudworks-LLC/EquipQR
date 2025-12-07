import { useOrganizationMembers } from './useOrganizationMembers';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getSimplifiedOrganizationRestrictions, getRestrictionMessage } from '@/utils/simplifiedOrganizationRestrictions';

export const useSimplifiedOrganizationRestrictions = (fleetMapEnabled: boolean = false) => {
  const { currentOrganization } = useOrganization();
  const { data: members = [], isLoading } = useOrganizationMembers(currentOrganization?.id || '');

  // Billing is disabled - all features are enabled
  const restrictions = getSimplifiedOrganizationRestrictions();

  const checkRestriction = (restriction: keyof typeof restrictions) => {
    return {
      allowed: restrictions[restriction],
      message: restrictions[restriction] ? '' : getRestrictionMessage(restriction),
      upgradeMessage: restrictions.upgradeMessage
    };
  };

  const activeMemberCount = members.filter(m => m.status === 'active').length;
  const isSingleUser = activeMemberCount === 1;

  return {
    restrictions,
    checkRestriction,
    getRestrictionMessage,
    isSingleUser,
    canUpgrade: true, // Billing is disabled - all features are free
    isLoading
  };
};