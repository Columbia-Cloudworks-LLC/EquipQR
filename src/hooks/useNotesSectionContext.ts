import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSession } from '@/hooks/useSession';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

export function useNotesSectionContext(teamId?: string) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { sessionData } = useSession();
  const unified = useUnifiedPermissions();

  const isOrgAdmin = unified.hasRole(['owner', 'admin']);
  const isTeamManager = teamId ? unified.isTeamManager(teamId) : false;
  const editWindowHours =
    (currentOrganization as { note_author_edit_window_hours?: number } | null)
      ?.note_author_edit_window_hours ?? 24;

  const teamMembership = useMemo(() => {
    if (!teamId || !sessionData?.teamMemberships) return null;
    return sessionData.teamMemberships.find((tm) => tm.teamId === teamId) ?? null;
  }, [teamId, sessionData?.teamMemberships]);

  const isViewerOrRequestor =
    teamMembership?.role === 'viewer' || teamMembership?.role === 'requestor';

  return {
    user,
    currentOrganization,
    isOrgAdmin,
    isTeamManager,
    editWindowHours,
    isViewerOrRequestor,
  };
}
