import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { isOrgAdminRole } from '@/features/teams/utils/teamAccessScope';
import { useOfflineEquipmentDownload } from '@/features/offline-queue/hooks/useOfflineEquipmentDownload';

/**
 * Mounted once in the dashboard. Keeps the signed-in user's equipment saved
 * on the device for the organization that is open. Renders nothing.
 */
export function OfflineEquipmentDownload(): null {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const isOrgAdmin = isOrgAdminRole(currentOrganization?.userRole);

  useOfflineEquipmentDownload(user?.id, currentOrganization?.id, {
    userTeamIds: isOrgAdmin ? undefined : getUserTeamIds(),
    isOrgAdmin,
    enabled: isOrgAdmin || !teamsLoading,
  });

  return null;
}
