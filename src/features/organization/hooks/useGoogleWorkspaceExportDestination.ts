import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { googleWorkspace } from '@/lib/queryKeys';
import {
  getGoogleExportDestination,
  setGoogleExportDestination,
  type GoogleExportDestination,
  type GoogleExportSelectionKind,
} from '@/services/google-workspace';

const INTERNAL_PACKET_DOC_TYPE = 'work-orders-internal-packet' as const;

export function useGoogleWorkspaceExportDestination(organizationId?: string) {
  const queryClient = useQueryClient();

  const destinationQuery = useQuery<GoogleExportDestination | null, Error>({
    queryKey: googleWorkspace.destination(organizationId ?? '', INTERNAL_PACKET_DOC_TYPE),
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return getGoogleExportDestination(organizationId, INTERNAL_PACKET_DOC_TYPE);
    },
    enabled: Boolean(organizationId),
    staleTime: 60 * 1000,
  });

  const setDestinationMutation = useMutation({
    mutationFn: async (input: { selectionKind: GoogleExportSelectionKind; parentId: string }) => {
      if (!organizationId) throw new Error('Organization ID is required');
      return setGoogleExportDestination({
        organizationId,
        documentType: INTERNAL_PACKET_DOC_TYPE,
        selectionKind: input.selectionKind,
        parentId: input.parentId,
      });
    },
    onSuccess: async () => {
      if (!organizationId) return;
      await queryClient.invalidateQueries({
        queryKey: googleWorkspace.destination(organizationId, INTERNAL_PACKET_DOC_TYPE),
      });
    },
  });

  return {
    destination: destinationQuery.data ?? null,
    isLoadingDestination: destinationQuery.isLoading,
    destinationError: destinationQuery.error ?? null,
    refetchDestination: destinationQuery.refetch,
    setDestination: setDestinationMutation.mutateAsync,
    isSettingDestination: setDestinationMutation.isPending,
    setDestinationError: setDestinationMutation.error ?? null,
  };
}
