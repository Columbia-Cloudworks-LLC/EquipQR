
import { useOrganizationMembers } from './useOrganizationMembers';
import { useOrganizationAdmins } from './useOrganizationAdmins';
import { useSlotAvailability } from './useOrganizationSlots';
import { SessionOrganization } from '@/contexts/SessionContext';

export interface OrganizationStats {
  memberCount: number;
  adminCount: number;
  plan: string;
  featureCount: number;
  isLoading: boolean;
}

export const useOrganizationStats = (organization: SessionOrganization | null): OrganizationStats => {
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembers(organization?.id || '');
  const { data: admins = [], isLoading: adminsLoading } = useOrganizationAdmins(organization?.id || '');
  const { data: slotAvailability, isLoading: slotsLoading } = useSlotAvailability(organization?.id || '');

  // Determine plan based on active member count and slot availability
  const activeMemberCount = members.filter(m => m.status === 'active').length;
  const hasPurchasedSlots = Boolean(slotAvailability && slotAvailability.total_purchased > 0);
  const plan = activeMemberCount === 1 && !hasPurchasedSlots ? 'Starter (Free)' : 'Pay-as-you-go';
  
  // Feature count based on plan type
  const featureCount = activeMemberCount === 1 ? 3 : 6; // Basic vs full features

  return {
    memberCount: activeMemberCount,
    adminCount: admins.length,
    plan,
    featureCount,
    isLoading: membersLoading || adminsLoading || slotsLoading
  };
};
