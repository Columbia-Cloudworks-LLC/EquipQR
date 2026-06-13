import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const { mockInvalidateQueries, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockInvalidateQueries: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

import { useOrganizationIntegrationOAuthCallbacks } from '../useOrganizationIntegrationOAuthCallbacks';

function wrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

describe('useOrganizationIntegrationOAuthCallbacks', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it('shows Google Workspace error toast and clears gw_error params', () => {
    renderHook(() => useOrganizationIntegrationOAuthCallbacks(), {
      wrapper: wrapper([
        '/dashboard/organization/integrations?gw_error=oauth_failed&gw_error_description=Token+missing',
      ]),
    });

    expect(mockToastError).toHaveBeenCalledWith('Token missing');
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('shows Google Workspace success toast and invalidates workspace queries', () => {
    renderHook(() => useOrganizationIntegrationOAuthCallbacks(), {
      wrapper: wrapper(['/dashboard/organization/integrations?gw_connected=true']),
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Google Workspace reconnected successfully!');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['google-workspace'] });
  });
});
