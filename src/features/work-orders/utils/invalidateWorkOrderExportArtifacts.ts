import type { QueryClient } from '@tanstack/react-query';
import {
  GOOGLE_DRIVE_ARTIFACT_KINDS,
  GOOGLE_DRIVE_EXPORT_CHANNELS,
} from '@/features/work-orders/constants/googleDriveExportArtifacts';
import { exportArtifacts } from '@/lib/queryKeys';

export function invalidateWorkOrderExportArtifacts(
  queryClient: QueryClient,
  organizationId: string,
  workOrderId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: exportArtifacts.byRecord(organizationId, 'work_order', workOrderId),
  });

  const channels = [
    [GOOGLE_DRIVE_EXPORT_CHANNELS.DOCS, GOOGLE_DRIVE_ARTIFACT_KINDS.INTERNAL_PACKET],
    [GOOGLE_DRIVE_EXPORT_CHANNELS.PDF, GOOGLE_DRIVE_ARTIFACT_KINDS.SERVICE_REPORT_PDF],
    [GOOGLE_DRIVE_EXPORT_CHANNELS.SHEETS, GOOGLE_DRIVE_ARTIFACT_KINDS.INTERNAL_PACKET],
  ] as const;

  for (const [exportChannel, artifactKind] of channels) {
    void queryClient.invalidateQueries({
      queryKey: exportArtifacts.latest(
        organizationId,
        'work_order',
        workOrderId,
        exportChannel,
        artifactKind,
      ),
    });
  }
}
