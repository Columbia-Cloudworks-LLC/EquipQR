import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDsrCase, mutateDsrRequest } from '@/features/dsr/api/dsrApi';

export function useDsrCase(organizationId: string | null, dsrRequestId: string | null) {
  return useQuery({
    queryKey: ['dsr', 'case', organizationId, dsrRequestId],
    queryFn: () => fetchDsrCase(organizationId as string, dsrRequestId as string),
    enabled: Boolean(organizationId && dsrRequestId),
  });
}

export function useDsrMutation(organizationId: string | null, dsrRequestId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      expectedUpdatedAt,
      payload,
    }: {
      action:
        | 'verify'
        | 'deny'
        | 'extend'
        | 'record_fulfillment_step'
        | 'fulfill_deletion'
        | 'complete'
        | 'add_note'
        | 'request_export'
        | 'retry_export'
        | 'resend_notice';
      expectedUpdatedAt: string;
      payload?: Record<string, unknown>;
    }) => mutateDsrRequest(organizationId as string, dsrRequestId as string, action, expectedUpdatedAt, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dsr', 'queue', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['dsr', 'case', organizationId, dsrRequestId] });
    },
  });
}
