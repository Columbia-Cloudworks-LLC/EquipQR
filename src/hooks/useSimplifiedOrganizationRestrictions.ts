import { useOrganizationMembers } from './useOrganizationMembers';
import { useSlotAvailability } from './useOrganizationSlots';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getSimplifiedOrganizationRestrictions, getRestrictionMessage } from '@/utils/simplifiedOrganizationRestrictions';

export const useSimplifiedOrganizationRestrictions = (fleetMapEnabled: boolean = false) => {
  const { currentOrganization } = useOrganization();
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id || '');
  const { data: slotAvailability, isLoading } = useSlotAvailability(currentOrganization?.id || '');

  // Provide safe defaults while loading
  const safeSlotAvailability = slotAvailability || {
    total_purchased: 0,
    used_slots: 0,
    available_slots: 0,
    exempted_slots: 0,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date().toISOString()
  };

  const restrictions = getSimplifiedOrganizationRestrictions(
    members, 
    safeSlotAvailability, 
    fleetMapEnabled
  );

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
    canUpgrade: true, // Always can upgrade in pay-as-you-go model
    isLoading
  };
};