import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { supabase } from '@/integrations/supabase/client';
import { downloadBlob } from '@/utils/exportUtils';
import { logger } from '@/utils/logger';

export type ExportJobStatus = {
  success: boolean;
  jobId?: string;
  status?: string;
  reportType?: string;
  rowCount?: number;
  resultUrl?: string | null;
  resultStoragePath?: string | null;
  errorMessage?: string | null;
  code?: string;
};

const TERMINAL = new Set(['completed', 'failed', 'rate_limited']);

/**
 * Show a persistent loading toast while an export (sync or async) is in flight.
 * Returns update/dismiss helpers so callers can flip to success/error.
 */
export function showExportLoadingToast(label: string) {
  const handle = toast({
    title: 'Export in progress',
    description: `${label} — this can take a few seconds. Please keep this tab open.`,
    duration: Infinity,
  });

  return {
    id: handle.id,
    updateSuccess: (description: string, downloadUrl?: string) => {
      handle.update({
        id: handle.id,
        title: 'Export Complete',
        description,
        duration: 8000,
        action: downloadUrl
          ? (
              <ToastAction
                altText="Download export"
                onClick={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')}
              >
                Download
              </ToastAction>
            )
          : undefined,
      });
    },
    updateError: (description: string) => {
      handle.update({
        id: handle.id,
        title: 'Export Failed',
        description,
        variant: 'destructive',
        duration: 8000,
      });
    },
    dismiss: () => handle.dismiss(),
  };
}

export async function getExportJobStatus(jobId: string): Promise<ExportJobStatus> {
  const { data, error } = await supabase.rpc('get_export_job_status', {
    p_job_id: jobId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? { success: false }) as ExportJobStatus;
}

/**
 * Poll get_export_job_status until terminal, then download via signed URL when present.
 */
export async function waitForExportJob(
  jobId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    onStatus?: (status: ExportJobStatus) => void;
  },
): Promise<ExportJobStatus> {
  const intervalMs = options?.intervalMs ?? 1500;
  const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const status = await getExportJobStatus(jobId);
    options?.onStatus?.(status);

    if (status.success === false) {
      if (status.code === 'not_found') {
        throw new Error('Export job not found');
      }
      if (status.code === 'rate_limited' || status.status === 'rate_limited') {
        throw new Error(
          status.errorMessage ||
            'Rate limit exceeded. Please wait before requesting another export.',
        );
      }
      throw new Error(
        status.errorMessage ||
          (status.code ? `Export job error: ${status.code}` : 'Export job failed'),
      );
    }

    if (status.status && TERMINAL.has(status.status)) {
      return status;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('Export timed out. Check notifications later or try again.');
}

export async function downloadExportJobResult(
  status: ExportJobStatus,
  filename: string,
): Promise<void> {
  if (!status.resultUrl && !status.resultStoragePath) {
    throw new Error('Export completed but no download URL was returned');
  }

  if (status.resultStoragePath) {
    const { data, error } = await supabase.storage
      .from('export-results')
      .download(status.resultStoragePath);
    if (error || !data) {
      logger.error('Failed to download export from storage', {
        error: error?.message,
        path: status.resultStoragePath,
      });
      throw new Error(error?.message ?? 'Failed to download export');
    }
    downloadBlob(data, filename);
    return;
  }

  const response = await fetch(status.resultUrl!);
  if (!response.ok) {
    throw new Error(`Failed to download export (${response.status})`);
  }
  downloadBlob(await response.blob(), filename);
}
