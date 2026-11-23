import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { isOrgAdminRole } from '@/features/teams/utils/teamAccessScope';
import { readLastOfflineDownload } from '@/features/offline-queue/hooks/useOfflineEquipmentDownload';

/**
 * One line telling a technician with no signal whether this device holds a
 * full copy of their equipment, work orders and inventory, and how old it
 * is. Without it there is no way to tell "nothing to show" from "the copy
 * was never downloaded".
 */
export function OfflineCopyStatus(): React.JSX.Element | null {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { getUserTeamIds } = useTeamMembership();
  if (!user || !currentOrganization) return null;

  const isOrgAdmin = isOrgAdminRole(currentOrganization.userRole);
  const savedAt = readLastOfflineDownload(user.id, currentOrganization.id, {
    isOrgAdmin,
    userTeamIds: isOrgAdmin ? undefined : getUserTeamIds(),
  });

  return (
    <span className="block">
      {savedAt
        ? `Equipment, work orders and inventory were saved to this device ${formatDistanceToNow(savedAt, { addSuffix: true })}.`
        : 'A full copy has not been saved to this device yet, so only screens you opened before are available. It downloads automatically the next time you are connected.'}
    </span>
  );
}
