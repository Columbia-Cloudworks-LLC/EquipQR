import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { customRender } from '@vitest-harness/utils/renderUtils';

const {
  mockInvalidateQueries,
  mockSetSearchParams,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockInvalidateQueries: vi.fn(),
  mockSetSearchParams: vi.fn(),
  mockToastSuccess: vi.fn(),
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
    useSearchParams: () => [new URLSearchParams('qb_connected=true&realm_id=123'), mockSetSearchParams],
    useNavigate: () => vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: vi.fn(),
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

vi.mock('@/features/organization/hooks/useOrganizationMembers', () => ({
  useOrganizationMembersQuery: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/features/organization/hooks/useWorkspacePersonalOrgMerge', () => ({
  usePendingWorkspaceMergeRequests: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/usePagePermissions', () => ({
  usePagePermissions: () => ({
    canManageMembers: true,
  }),
}));

vi.mock('@/features/organization/components/OrganizationSubnav', () => ({
  OrganizationSubnav: () => <div>Organization Subnav</div>,
}));

vi.mock('@/features/organization/components/OrganizationSettings', () => ({
  OrganizationSettings: () => <div>Organization Settings</div>,
}));

vi.mock('@/features/organization/components/RestrictedOrganizationAccess', () => ({
  default: () => <div>Restricted Access</div>,
}));

vi.mock('@/features/organization/components/WorkspaceMergeRequestsCard', () => ({
  WorkspaceMergeRequestsCard: () => <div>Workspace Merge Requests</div>,
}));

import Organization from './Organization';

describe('Organization page OAuth callbacks', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockReset();
    mockSetSearchParams.mockReset();
    mockToastSuccess.mockReset();
  });

  it('handles qb_connected callbacks via shared integration OAuth hook', () => {
    customRender(<Organization />);

    expect(mockToastSuccess).toHaveBeenCalledWith('QuickBooks connected successfully!');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['quickbooks', 'connection'],
    });

    const [updatedParams, options] = mockSetSearchParams.mock.calls[0];
    expect(updatedParams).toBeInstanceOf(URLSearchParams);
    expect(updatedParams.get('qb_connected')).toBeNull();
    expect(updatedParams.get('realm_id')).toBeNull();
    expect(options).toEqual({ replace: true });
  });

  it('renders organization settings for admin users', () => {
    customRender(<Organization />);

    expect(screen.getByText('Organization Subnav')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Organization Settings' })).toBeInTheDocument();
  });
});
