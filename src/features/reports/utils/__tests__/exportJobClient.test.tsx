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

import { showExportLoadingToast } from '@/features/reports/utils/exportJobClient';

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
