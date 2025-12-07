import { useOrganizationMembers } from './useOrganizationMembers';
import { useOrganizationAdmins } from './useOrganizationAdmins';
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

  // Billing is disabled - all features are free
  const activeMemberCount = members.filter(m => m.status === 'active').length;
  const plan = 'Free'; // All plans are free now
  const featureCount = 6; // All features available

  return {
    memberCount: activeMemberCount,
    adminCount: admins.length,
    plan,
    featureCount,
    isLoading: membersLoading || adminsLoading
  };
};
