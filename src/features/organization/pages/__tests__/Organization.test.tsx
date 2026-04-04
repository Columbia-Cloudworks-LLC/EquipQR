import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customRender } from '@/test/utils/renderUtils';

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
    useSearchParams: () => [new URLSearchParams('gw_connected=true'), mockSetSearchParams],
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

vi.mock('@/features/organization/components/OrganizationHeader', () => ({
  default: () => <div>Organization Header</div>,
}));

vi.mock('@/features/organization/components/OrganizationTabs', () => ({
  default: () => <div>Organization Tabs</div>,
}));

vi.mock('@/features/organization/components/RestrictedOrganizationAccess', () => ({
  default: () => <div>Restricted Access</div>,
}));

vi.mock('@/features/organization/components/WorkspaceMergeRequestsCard', () => ({
  WorkspaceMergeRequestsCard: () => <div>Workspace Merge Requests</div>,
}));

import Organization from '../Organization';

describe('Organization page OAuth callbacks', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockReset();
    mockSetSearchParams.mockReset();
    mockToastSuccess.mockReset();
  });

  it('handles gw_connected callbacks by showing success feedback and refreshing Google Workspace queries', () => {
    customRender(<Organization />);

    expect(mockToastSuccess).toHaveBeenCalledWith('Google Workspace reconnected successfully!');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['google-workspace'],
    });

    const [updatedParams, options] = mockSetSearchParams.mock.calls[0];
    expect(updatedParams).toBeInstanceOf(URLSearchParams);
    expect(updatedParams.get('gw_connected')).toBeNull();
    expect(options).toEqual({ replace: true });
  });
});
