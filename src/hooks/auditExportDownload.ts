import { format } from 'date-fns';
import type { AuditLogFilters } from '@/types/audit';
import { auditService } from '@/services/auditService';

type ExportToast = (args: {
  title: string;
  description: string;
  variant: 'success' | 'error';
}) => void;

async function downloadAuditExportBlob(
  organizationId: string,
  filters: AuditLogFilters | undefined,
  onProgress: ((progress: { current: number; total: number }) => void) | undefined,
  formatKind: 'csv' | 'json',
): Promise<string> {
  const result =
    formatKind === 'csv'
      ? await auditService.exportToCsv(organizationId, filters, onProgress)
      : await auditService.exportToJson(organizationId, filters, onProgress);

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Export failed');
  }

  return result.data;
}

function triggerBrowserDownload(data: string, mimeType: string, extension: 'csv' | 'json') {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function runAuditExportDownload(
  organizationId: string | undefined,
  toast: ExportToast,
  formatKind: 'csv' | 'json',
  filters?: AuditLogFilters,
  onProgress?: (progress: { current: number; total: number }) => void,
): Promise<void> {
  if (!organizationId) {
    toast({
      title: 'Export Failed',
      description: 'Organization ID is required',
      variant: 'error',
    });
    return;
  }

  const label = formatKind === 'csv' ? 'CSV' : 'JSON';

  try {
    const data = await downloadAuditExportBlob(
      organizationId,
      filters,
      onProgress,
      formatKind,
    );
    triggerBrowserDownload(
      data,
      formatKind === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;',
      formatKind,
    );
    toast({
      title: 'Export Complete',
      description: `Audit log has been exported to ${label}`,
      variant: 'success',
    });
  } catch (error) {
    toast({
      title: 'Export Failed',
      description: error instanceof Error ? error.message : 'Failed to export audit log',
      variant: 'error',
    });
  }
}
