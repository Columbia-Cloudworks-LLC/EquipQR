import { supabase } from '@/integrations/supabase/client';
import type {
  PersonalOrgMergePreview,
  WorkspaceMergeActionResult,
  WorkspaceMergeRequest,
} from '@/features/organization/types/workspacePersonalOrgMerge';

export const getPendingWorkspacePersonalOrgMergeRequests = async (): Promise<WorkspaceMergeRequest[]> => {
  const { data, error } = await supabase
    .rpc('get_pending_workspace_personal_org_merge_requests');

  if (error) throw error;
  return data || [];
};

export const requestWorkspacePersonalOrgMerge = async ({
  workspaceOrgId,
  targetUserId,
  reason,
}: {
  workspaceOrgId: string;
  targetUserId: string;
  reason?: string;
}): Promise<WorkspaceMergeActionResult> => {
  const { data, error } = await supabase
    .rpc('request_workspace_personal_org_merge', {
      p_workspace_org_id: workspaceOrgId,
      p_target_user_id: targetUserId,
      p_reason: reason || null,
    });

  if (error) throw error;
  return data as WorkspaceMergeActionResult;
};

export const respondToWorkspacePersonalOrgMerge = async ({
  requestId,
  accept,
  responseReason,
}: {
  requestId: string;
  accept: boolean;
  responseReason?: string;
}): Promise<WorkspaceMergeActionResult> => {
  const { data, error } = await supabase
    .rpc('respond_to_workspace_personal_org_merge', {
      p_request_id: requestId,
      p_accept: accept,
      p_response_reason: responseReason || null,
    });

  if (error) throw error;
  return data as WorkspaceMergeActionResult;
};

export const getPersonalOrgMergePreview = async (
  workspaceOrgId: string
): Promise<PersonalOrgMergePreview> => {
  const { data, error } = await supabase
    .rpc('get_personal_org_merge_preview', {
      p_workspace_org_id: workspaceOrgId,
    });

  if (error) throw error;
  return data as PersonalOrgMergePreview;
};
