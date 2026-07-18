/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { toastMock, updateMock, dismissMock } = vi.hoisted(() => {
  const updateMock = vi.fn();
  const dismissMock = vi.fn();
  const toastMock = vi.fn(() => ({
    id: 'toast-1',
    update: updateMock,
    dismiss: dismissMock,
  }));
  return { toastMock, updateMock, dismissMock };
});

vi.mock('@/hooks/use-toast', () => ({
  toast: toastMock,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(),
      })),
    },
  },
}));

vi.mock('@/utils/exportUtils', () => ({
  downloadBlob: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import {
  showExportLoadingToast,
  waitForExportJob,
} from '@/features/reports/utils/exportJobClient';
import { supabase } from '@/integrations/supabase/client';

describe('showExportLoadingToast', () => {
  beforeEach(() => {
    toastMock.mockClear();
    updateMock.mockClear();
    dismissMock.mockClear();
  });

  it('shows a persistent loading toast', () => {
    showExportLoadingToast('Preparing equipment report');
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Export in progress',
        duration: Infinity,
      }),
    );
  });

  it('updates to success with optional download action', () => {
    const loading = showExportLoadingToast('Exporting');
    loading.updateSuccess('Done', 'https://example.test/file.csv');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Export Complete',
        description: 'Done',
      }),
    );
  });

  it('updates to error state', () => {
    const loading = showExportLoadingToast('Exporting');
    loading.updateError('boom');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Export Failed',
        description: 'boom',
        variant: 'destructive',
      }),
    );
  });
});

describe('waitForExportJob', () => {
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockReset();
  });

  it('fails immediately when get_export_job_status returns not_found', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { success: false, code: 'not_found' },
      error: null,
    } as never);

    await expect(
      waitForExportJob('missing-job', { intervalMs: 10, timeoutMs: 1000 }),
    ).rejects.toThrow('Export job not found');
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('returns when status reaches a terminal state', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        success: true,
        status: 'completed',
        jobId: 'job-1',
        rowCount: 3,
        resultUrl: 'https://example.test/file.csv',
      },
      error: null,
    } as never);

    const status = await waitForExportJob('job-1', {
      intervalMs: 10,
      timeoutMs: 1000,
    });
    expect(status.status).toBe('completed');
    expect(status.rowCount).toBe(3);
  });
});
