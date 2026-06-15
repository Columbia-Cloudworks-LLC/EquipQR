import { useQuery } from '@tanstack/react-query';
import { exportArtifacts } from '@/lib/queryKeys';
import { getLatestExportArtifact } from '@/services/google-workspace/recordExportArtifactsService';

export function useLatestExportArtifact(
  organizationId: string | undefined,
  workOrderId: string | undefined,
  exportChannel: string,
  artifactKind: string,
  enabled = true,
) {
  return useQuery({
    queryKey: exportArtifacts.latest(
      organizationId ?? '',
      'work_order',
      workOrderId ?? '',
      exportChannel,
      artifactKind,
    ),
    queryFn: () =>
      getLatestExportArtifact(
        organizationId!,
        'work_order',
        workOrderId!,
        exportChannel,
        artifactKind,
      ),
    enabled: Boolean(organizationId && workOrderId && enabled),
    staleTime: 30 * 1000,
  });
}
