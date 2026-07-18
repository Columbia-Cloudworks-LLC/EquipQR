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

import { useOrganizationIntegrationOAuthCallbacks } from './useOrganizationIntegrationOAuthCallbacks';

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

  it('maps Google Workspace error codes to safe toast messages and clears callback params', () => {
    renderHook(() => useOrganizationIntegrationOAuthCallbacks(), {
      wrapper: wrapper([
        '/dashboard/organization/integrations?gw_error=oauth_failed&gw_error_description=internal+postgres+constraint+users_pkey&gw_ref=corr-123',
      ]),
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Failed to connect Google Workspace. Please try again. Reference: corr-123',
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('does not show success toast when gw_error and gw_connected are both present', () => {
    renderHook(() => useOrganizationIntegrationOAuthCallbacks(), {
      wrapper: wrapper([
        '/dashboard/organization/integrations?gw_error=oauth_failed&gw_connected=true',
      ]),
    });

    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('shows Google Workspace success toast and invalidates workspace queries', () => {
    renderHook(() => useOrganizationIntegrationOAuthCallbacks(), {
      wrapper: wrapper(['/dashboard/organization/integrations?gw_connected=true']),
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Google Workspace connected successfully!');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['google-workspace'] });
  });
});
