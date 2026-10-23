import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAppToast } from '@/hooks/useAppToast';
import {
  attachGoogleDriveDocumentReference,
  getDocumentSignoffs,
  getMaterializedScopeAttachments,
  getOrganizationCanonicalDocuments,
  getWorkOrderAttachmentsForEquipment,
  signOffCanonicalDocument,
  softDeleteDocumentAttachment,
  type AttachDriveDocumentInput,
} from '@/features/documents/services/hierarchicalDocumentsService';

export const hierarchicalDocumentsKeys = {
  root: (orgId: string) => ['hierarchical-documents', orgId] as const,
  canonical: (orgId: string) => ['hierarchical-documents', orgId, 'canonical'] as const,
  attachments: (orgId: string, scopeIdsKey: string) =>
    ['hierarchical-documents', orgId, 'attachments', scopeIdsKey] as const,
  equipmentWoDocs: (orgId: string, equipmentId: string) =>
    ['hierarchical-documents', orgId, 'equipment-wo-docs', equipmentId] as const,
  signoffs: (orgId: string, documentId: string) =>
    ['hierarchical-documents', orgId, 'signoffs', documentId] as const,
};

export function useOrganizationCanonicalDocuments(organizationId: string | undefined) {
  return useQuery({
    queryKey: hierarchicalDocumentsKeys.canonical(organizationId ?? ''),
    queryFn: async () => {
      if (!organizationId) return [];
      return await getOrganizationCanonicalDocuments(organizationId);
    },
    enabled: !!organizationId,
  });
}

export function useMaterializedScopeAttachments(
  organizationId: string | undefined,
  scopeIds: string[],
) {
  const sortedKey = [...scopeIds].filter(Boolean).sort().join(',');

  return useQuery({
    queryKey: hierarchicalDocumentsKeys.attachments(organizationId ?? '', sortedKey),
    queryFn: async () => {
      if (!organizationId || !sortedKey) return [];
      return await getMaterializedScopeAttachments({
        organizationId,
        scopeIds: sortedKey.split(','),
      });
    },
    enabled: !!organizationId && Boolean(sortedKey),
  });
}

export function useWorkOrderDocumentsForEquipment(
  organizationId: string | undefined,
  equipmentId: string | undefined,
) {
  return useQuery({
    queryKey: hierarchicalDocumentsKeys.equipmentWoDocs(
      organizationId ?? '',
      equipmentId ?? '',
    ),
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      return await getWorkOrderAttachmentsForEquipment(organizationId, equipmentId);
    },
    enabled: !!organizationId && !!equipmentId,
  });
}

export function useDocumentSignoffs(
  organizationId: string | undefined,
  documentId: string | undefined,
) {
  return useQuery({
    queryKey: hierarchicalDocumentsKeys.signoffs(organizationId ?? '', documentId ?? ''),
    queryFn: async () => {
      if (!organizationId || !documentId) return [];
      return await getDocumentSignoffs(organizationId, documentId);
    },
    enabled: !!organizationId && !!documentId,
  });
}

export function useAttachGoogleDriveDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const appToast = useAppToast();

  return useMutation({
    mutationFn: async (input: Omit<AttachDriveDocumentInput, 'userId'>) => {
      if (!user) throw new Error('User must be authenticated');
      return await attachGoogleDriveDocumentReference({
        ...input,
        userId: user.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hierarchicalDocumentsKeys.root(variables.organizationId),
      });
      appToast.success({
        description: 'Google Drive document attached and Reader grants confirmed',
      });
    },
    onError: (error) => {
      appToast.error({
        description:
          error instanceof Error ? error.message : 'Failed to attach Google Drive document',
      });
    },
  });
}

export function useRemoveDocumentAttachment() {
  const queryClient = useQueryClient();
  const appToast = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      attachmentId,
    }: {
      organizationId: string;
      attachmentId: string;
    }) => {
      await softDeleteDocumentAttachment(organizationId, attachmentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hierarchicalDocumentsKeys.root(variables.organizationId),
      });
      appToast.success({
        description: 'Document attachment removed',
      });
    },
    onError: (error) => {
      appToast.error({
        description:
          error instanceof Error ? error.message : 'Failed to remove document attachment',
      });
    },
  });
}

export function useSignOffCanonicalDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const appToast = useAppToast();

  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      documentId: string;
      action: 'affirm' | 'replace';
      previousFileId: string;
      newFileId?: string;
      newTitle?: string;
      newWebViewLink?: string | null;
      notes?: string | null;
    }) => {
      if (!user) throw new Error('User must be authenticated');
      return await signOffCanonicalDocument({
        ...params,
        userId: user.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: hierarchicalDocumentsKeys.root(variables.organizationId),
      });
      appToast.success({
        description:
          variables.action === 'replace'
            ? 'Document replaced and renewal cycle signed off'
            : 'Document renewal cycle signed off',
      });
    },
    onError: (error) => {
      appToast.error({
        description:
          error instanceof Error ? error.message : 'Failed to sign off document',
      });
    },
  });
}
