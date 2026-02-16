/**
 * useWorkspacePersonalOrgMerge - Hooks for managing per-user personal org merges
 *
 * Provides queries and mutations for:
 * - Viewing pending merge requests
 * - Initiating merge requests
 * - Accepting/rejecting merge requests
 * - Previewing personal org data counts
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppToast } from '@/hooks/useAppToast';
import { workspacePersonalOrgMerge } from '@/lib/queryKeys';
import type { PersonalOrgMergePreview, WorkspaceMergeActionResult, WorkspaceMergeRequest } from '@/features/organization/types/workspacePersonalOrgMerge';
import {
  getPendingWorkspacePersonalOrgMergeRequests,
  getPersonalOrgMergePreview,
  requestWorkspacePersonalOrgMerge,
  respondToWorkspacePersonalOrgMerge,
} from '@/features/organization/services/workspacePersonalOrgMergeService';

// ============================================
// Queries
// ============================================

export const usePendingWorkspaceMergeRequests = () => {
  const { user } = useAuth();
  const queryKeyFactory = user?.id ? workspacePersonalOrgMerge(user.id) : null;

  return useQuery({
    queryKey: queryKeyFactory?.pending() ?? ['workspace-personal-org-merge', 'pending'],
    queryFn: async (): Promise<WorkspaceMergeRequest[]> => {
      return getPendingWorkspacePersonalOrgMergeRequests();
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
};

export const usePersonalOrgMergePreview = (workspaceOrgId: string | undefined) => {
  const { user } = useAuth();
  const queryKeyFactory = user?.id ? workspacePersonalOrgMerge(user.id) : null;

  return useQuery({
    queryKey: queryKeyFactory?.preview(workspaceOrgId || 'unknown') ?? ['workspace-personal-org-merge', 'preview', workspaceOrgId],
    queryFn: async (): Promise<PersonalOrgMergePreview> => {
      if (!workspaceOrgId) {
        return { success: false, error: 'Missing workspace organization id' };
      }

      const result = await getPersonalOrgMergePreview(workspaceOrgId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to load preview');
      }

      return result;
    },
    enabled: !!user?.id && !!workspaceOrgId,
    staleTime: 60 * 1000,
  });
};

// ============================================
// Mutations
// ============================================

export const useRequestWorkspaceMerge = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();
  const { user } = useAuth();
  const queryKeyFactory = user?.id ? workspacePersonalOrgMerge(user.id) : null;

  return useMutation({
    mutationFn: async ({
      workspaceOrgId,
      targetUserId,
      reason,
    }: {
      workspaceOrgId: string;
      targetUserId: string;
      reason?: string;
    }): Promise<WorkspaceMergeActionResult> => {
      const result = await requestWorkspacePersonalOrgMerge({
        workspaceOrgId,
        targetUserId,
        reason,
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to request merge');
      }

      return result;
    },
    onSuccess: (result) => {
      if (queryKeyFactory) {
        queryClient.invalidateQueries({ queryKey: queryKeyFactory.root });
      }
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Merge Request Sent',
        description: result.message || 'The member will be notified to approve or decline.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Send Merge Request',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    },
  });
};

export const useRespondWorkspaceMerge = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryKeyFactory = user?.id ? workspacePersonalOrgMerge(user.id) : null;

  return useMutation({
    mutationFn: async ({
      requestId,
      accept,
      responseReason,
    }: {
      requestId: string;
      accept: boolean;
      responseReason?: string;
    }): Promise<WorkspaceMergeActionResult> => {
      const result = await respondToWorkspacePersonalOrgMerge({
        requestId,
        accept,
        responseReason,
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to respond to merge request');
      }

      return result;
    },
    onSuccess: (result, variables) => {
      if (queryKeyFactory) {
        queryClient.invalidateQueries({ queryKey: queryKeyFactory.root });
      }
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['simple-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      toast({
        title: variables.accept ? 'Merge Accepted' : 'Merge Declined',
        description: result.message || 'Your response has been recorded.',
        variant: variables.accept ? 'success' : undefined,
      });

      if (variables.accept) {
        navigate(0);
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to Respond',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    },
  });
};
