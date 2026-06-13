import { useMemo } from 'react';
import { useSession } from '@/hooks/useSession';
import { resolveGoogleWorkspaceManageAccess } from '@/features/organization/utils/googleWorkspaceManageAccess';

export function useGoogleWorkspaceManageAccess(organizationId?: string | null) {
  const { sessionData } = useSession();

  const canManage = useMemo(
    () => resolveGoogleWorkspaceManageAccess(organizationId, sessionData),
    [organizationId, sessionData],
  );

  return { canManage };
}
