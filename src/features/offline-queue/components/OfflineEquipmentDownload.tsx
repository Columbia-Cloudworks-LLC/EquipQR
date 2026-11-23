import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { isOrgAdminRole } from '@/features/teams/utils/teamAccessScope';
import {
  useOfflineEquipmentDownload,
  useRememberTeamMemberships,
} from '@/features/offline-queue/hooks/useOfflineEquipmentDownload';
import { useSession } from '@/hooks/useSession';

/**
 * Mounted once in the dashboard. Keeps the signed-in user's equipment saved
 * on the device for the organization that is open. Renders nothing.
 */
export function OfflineEquipmentDownload(): null {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const { sessionData } = useSession();
  const isOrgAdmin = isOrgAdminRole(currentOrganization?.userRole);

  // Only once the session's memberships are for the organization that is open.
  const sessionMatchesOrganization =
    !!currentOrganization && sessionData?.currentOrganizationId === currentOrganization.id;
  useRememberTeamMemberships(
    user?.id,
    currentOrganization?.id,
    sessionMatchesOrganization && !teamsLoading ? sessionData?.teamMemberships : undefined,
  );

  useOfflineEquipmentDownload(user?.id, currentOrganization?.id, {
    userTeamIds: isOrgAdmin ? undefined : getUserTeamIds(),
    isOrgAdmin,
    enabled: isOrgAdmin || !teamsLoading,
  });

  return null;
}
