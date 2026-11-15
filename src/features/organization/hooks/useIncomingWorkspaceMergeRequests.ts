import { useMemo } from 'react';
import { usePendingWorkspaceMergeRequests } from '@/features/organization/hooks/useWorkspacePersonalOrgMerge';
import type { WorkspaceMergeRequest } from '@/features/organization/types/workspacePersonalOrgMerge';

/** Pending personal-org merge requests addressed to the given workspace organization. */
export const useIncomingWorkspaceMergeRequests = (
  workspaceOrgId: string | undefined,
): WorkspaceMergeRequest[] => {
  const { data: mergeRequests = [] } = usePendingWorkspaceMergeRequests();

  return useMemo(() => {
    if (!workspaceOrgId) {
      return [];
    }

    return mergeRequests.filter(
      (request) => request.is_incoming && request.workspace_org_id === workspaceOrgId,
    );
  }, [mergeRequests, workspaceOrgId]);
};
