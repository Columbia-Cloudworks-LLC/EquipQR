import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { customRender } from '@vitest-harness/utils/renderUtils';

const {
  mockInvalidateQueries,
  mockSetSearchParams,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockInvalidateQueries: vi.fn(),
  mockSetSearchParams: vi.fn(),
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams('gw_connected=true'), mockSetSearchParams],
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: {
      id: 'org-123',
      name: 'Test Org',
      userRole: 'owner',
    },
    isLoading: false,
  }),
}));

vi.mock('@/features/organization/components/OrganizationIntegrationsPanel', () => ({
  default: () => <div>Integrations Panel</div>,
}));

import OrganizationIntegrations from './OrganizationIntegrations';

describe('OrganizationIntegrations page OAuth callbacks', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockReset();
    mockSetSearchParams.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it('handles gw_connected callbacks by showing success feedback and refreshing Google Workspace queries', () => {
    customRender(<OrganizationIntegrations />);

    expect(mockToastSuccess).toHaveBeenCalledWith('Google Workspace connected successfully!');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['google-workspace'],
    });

    const [updatedParams, options] = mockSetSearchParams.mock.calls[0];
    expect(updatedParams).toBeInstanceOf(URLSearchParams);
    expect(updatedParams.get('gw_connected')).toBeNull();
    expect(options).toEqual({ replace: true });
  });

  it('renders the integrations panel for admin users', () => {
    customRender(<OrganizationIntegrations />);

    expect(screen.getByRole('heading', { name: /integrations/i })).toBeInTheDocument();
    expect(screen.getByText('Integrations Panel')).toBeInTheDocument();
  });
});
