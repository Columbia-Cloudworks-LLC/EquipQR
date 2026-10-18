
import { SessionOrganization } from '@/contexts/SessionContext';

export interface PagePermissions {
  canInviteMembers: boolean;
}

export const usePagePermissions = (organization: SessionOrganization | null): PagePermissions => {
  if (!organization) {
    return {
      canInviteMembers: false
    };
  }

  const canInviteMembers =
    !organization.isSupportAccess && ['owner', 'admin'].includes(organization.userRole || '');

  return {
    canInviteMembers
  };
};
