import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { customRender } from '@vitest-harness/utils/renderUtils';

const {
  mockInvalidateQueries,
  mockNavigate,
  mockCanManageOrganization,
  mockSetSearchParams,
  mockSearchParams,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockInvalidateQueries: vi.fn(),
  mockNavigate: vi.fn(),
  mockCanManageOrganization: vi.fn(),
  mockSetSearchParams: vi.fn(),
  mockSearchParams: {
    value: '',
  },
  mockToastSuccess: vi.fn(),
}));

const mockOrganizationState = vi.hoisted(() => ({
  currentOrganization: {
    id: 'org-123',
    name: 'Test Org',
    userRole: 'owner',
  },
  isLoading: false,
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
    useSearchParams: () => [new URLSearchParams(mockSearchParams.value), mockSetSearchParams],
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: vi.fn(),
  },
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => mockOrganizationState,
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

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canManageOrganization: mockCanManageOrganization,
  }),
}));

vi.mock('@/features/organization/components/OrganizationSubnav', () => ({
  OrganizationSubnav: () => <nav aria-label="Organization sections">Organization Subnav</nav>,
}));

vi.mock('@/features/organization/components/OrganizationSettings', () => ({
  OrganizationSettings: () => (
    <form aria-label="Organization settings form">
      <label htmlFor="organization-name">Organization Name</label>
      <input id="organization-name" />
    </form>
  ),
}));

vi.mock('@/features/organization/components/RestrictedOrganizationAccess', () => ({
  default: () => <div role="alert">Restricted Access</div>,
}));

vi.mock('@/features/organization/components/WorkspaceMergeRequestsCard', () => ({
  WorkspaceMergeRequestsCard: () => <div>Workspace Merge Requests</div>,
}));

import Organization from './Organization';

describe('Organization page OAuth callbacks', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockReset();
    mockNavigate.mockReset();
    mockCanManageOrganization.mockReset();
    mockSetSearchParams.mockReset();
    mockToastSuccess.mockReset();
    mockSearchParams.value = '';
    mockOrganizationState.currentOrganization = {
      id: 'org-123',
      name: 'Test Org',
      userRole: 'owner',
    };
    mockOrganizationState.isLoading = false;
    mockCanManageOrganization.mockReturnValue(true);
    window.location.hash = '';
  });

  it('handles qb_connected callbacks via shared integration OAuth hook', () => {
    mockSearchParams.value = 'qb_connected=true&realm_id=123';
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

  it.each(['owner', 'admin'] as const)(
    'renders the organization tab bar and form for %s users',
    (role) => {
      mockOrganizationState.currentOrganization.userRole = role;
      mockCanManageOrganization.mockReturnValue(true);

      customRender(<Organization />);

      expect(
        screen.getByRole('navigation', { name: 'Organization sections' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Organization Settings' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Organization Name' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it.each([
    { label: 'viewer', userRole: 'viewer' },
    { label: 'technician', userRole: 'member' },
    { label: 'team manager without org-admin', userRole: 'member' },
  ])('renders denied state with no form fields for $label', ({ userRole }) => {
    mockOrganizationState.currentOrganization.userRole = userRole;
    mockCanManageOrganization.mockReturnValue(false);

    customRender(<Organization />);

    expect(screen.getByRole('alert')).toHaveTextContent('Restricted Access');
    expect(
      screen.queryByRole('navigation', { name: 'Organization sections' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Organization Name' })).not.toBeInTheDocument();
  });
});
