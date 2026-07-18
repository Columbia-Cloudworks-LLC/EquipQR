import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockAssertCanManage = vi.fn();
const mockDisconnect = vi.fn();
const mockNavigate = vi.fn();
const mockToast = vi.fn();

vi.mock('@/features/organization/utils/googleWorkspaceManageAccess', () => ({
  assertCanManageGoogleWorkspaceIntegration: (...args: unknown[]) => mockAssertCanManage(...args),
}));

vi.mock('@/services/google-workspace', () => ({
  disconnectGoogleWorkspace: (...args: unknown[]) => mockDisconnect(...args),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({ toast: mockToast }),
}));

import { useGoogleWorkspaceDisconnect } from './useGoogleWorkspaceDisconnect';

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useGoogleWorkspaceDisconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDisconnect.mockResolvedValue({
      success: true,
      domain: 'example.com',
    });
  });

  it('re-checks RBAC before calling disconnectGoogleWorkspace', async () => {
    mockAssertCanManage.mockResolvedValue(undefined);

    const { result } = renderHook(() => useGoogleWorkspaceDisconnect('org-123'), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockAssertCanManage).toHaveBeenCalledWith('org-123');
    expect(mockDisconnect).toHaveBeenCalledWith('org-123');
  });

  it('does not call disconnect when RBAC assertion fails', async () => {
    mockAssertCanManage.mockRejectedValue(new Error('denied'));

    const { result } = renderHook(() => useGoogleWorkspaceDisconnect('org-123'), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockDisconnect).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Failed to disconnect',
        variant: 'error',
      }),
    );
  });
});
