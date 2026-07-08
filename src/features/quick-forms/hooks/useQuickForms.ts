import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createQuickForm,
  deleteQuickForm,
  listQuickForms,
  rotateQuickFormToken,
  updateQuickForm,
} from '@/features/quick-forms/services/quickFormsService';
import type { QuickFormData } from '@/features/quick-forms/types/quickForm';
import { quickFormKeys } from './quickFormKeys';

function requireOrganizationId(organizationId: string | undefined): string {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }
  return organizationId;
}

export function useQuickForms(organizationId: string | undefined) {
  return useQuery({
    queryKey: quickFormKeys.list(organizationId),
    queryFn: () => listQuickForms(organizationId!),
    enabled: !!organizationId,
  });
}

export function useCreateQuickForm(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null; formData: QuickFormData }) =>
      createQuickForm({ organizationId: organizationId!, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickFormKeys.list(organizationId) });
    },
  });
}

export function useUpdateQuickForm(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      formId: string;
      name?: string;
      description?: string | null;
      formData?: QuickFormData;
      isActive?: boolean;
    }) => updateQuickForm({ organizationId: organizationId!, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickFormKeys.list(organizationId) });
    },
  });
}

export function useDeleteQuickForm(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => deleteQuickForm(formId, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickFormKeys.list(organizationId) });
      queryClient.invalidateQueries({
        queryKey: [...quickFormKeys.all, 'submissions', organizationId ?? 'none'],
      });
    },
  });
}

export function useRotateQuickFormToken(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) =>
      rotateQuickFormToken(formId, requireOrganizationId(organizationId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickFormKeys.list(organizationId) });
    },
  });
}
