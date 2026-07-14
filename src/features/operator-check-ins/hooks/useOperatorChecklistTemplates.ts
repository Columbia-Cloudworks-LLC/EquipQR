import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOperatorChecklistTemplate,
  deleteOperatorChecklistTemplate,
  getOperatorChecklistTemplate,
  listOperatorChecklistTemplates,
  restoreOperatorChecklistTemplate,
  updateOperatorChecklistTemplate,
} from '@/features/operator-check-ins/services/operatorChecklistTemplatesService';
import { operatorCheckinKeys } from '@/features/operator-check-ins/hooks/operatorCheckinKeys';
import type { OperatorChecklistTemplateData } from '@/features/operator-check-ins/types/operatorChecklist';

export function useOperatorChecklistTemplates(organizationId: string | undefined) {
  return useQuery({
    queryKey: operatorCheckinKeys.templates(organizationId ?? ''),
    queryFn: () => listOperatorChecklistTemplates(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useOperatorChecklistTemplate(
  templateId: string | undefined,
  organizationId: string | undefined,
) {
  return useQuery({
    queryKey: operatorCheckinKeys.template(templateId ?? ''),
    queryFn: () => getOperatorChecklistTemplate(templateId!, organizationId!),
    enabled: Boolean(templateId && organizationId),
  });
}

export function useCreateOperatorChecklistTemplate(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOperatorChecklistTemplate,
    onSuccess: () => {
      if (organizationId) {
        void queryClient.invalidateQueries({ queryKey: operatorCheckinKeys.templates(organizationId) });
      }
    },
  });
}

export function useUpdateOperatorChecklistTemplate(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      updates,
    }: {
      templateId: string;
      updates: {
        name?: string;
        description?: string | null;
        templateData?: OperatorChecklistTemplateData;
      };
    }) => updateOperatorChecklistTemplate(templateId, organizationId!, updates),
    onSuccess: (_data, variables) => {
      if (organizationId) {
        void queryClient.invalidateQueries({ queryKey: operatorCheckinKeys.templates(organizationId) });
      }
      void queryClient.invalidateQueries({ queryKey: operatorCheckinKeys.template(variables.templateId) });
    },
  });
}

export function useDeleteOperatorChecklistTemplate(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOperatorChecklistTemplate,
    onSuccess: (_data, templateId) => {
      if (organizationId) {
        void queryClient.invalidateQueries({ queryKey: operatorCheckinKeys.templates(organizationId) });
        void queryClient.invalidateQueries({
          queryKey: operatorCheckinKeys.organizationAssignments(organizationId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: operatorCheckinKeys.template(templateId) });
    },
  });
}

export function useRestoreOperatorChecklistTemplate(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreOperatorChecklistTemplate,
    onSuccess: (_data, templateId) => {
      if (organizationId) {
        void queryClient.invalidateQueries({ queryKey: operatorCheckinKeys.templates(organizationId) });
        void queryClient.invalidateQueries({
          queryKey: operatorCheckinKeys.organizationAssignments(organizationId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: operatorCheckinKeys.template(templateId) });
    },
  });
}
