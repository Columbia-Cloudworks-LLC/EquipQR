import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import TeamDetails from '@/pages/TeamDetails';

// Keep real router but stub params/navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ teamId: 'team-1' })),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

// Organization context
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({ currentOrganization: { id: 'org-1' }, isLoading: false })),
}));

// Team hooks
const mockTeam = {
  id: 'team-1',
  name: 'Alpha Team',
  description: 'Test team',
  member_count: 2,
  members: [{ id: 'u1' }, { id: 'u2' }],
  created_at: new Date().toISOString(),
};

vi.mock('@/hooks/useTeamManagement', () => ({
  useTeam: vi.fn(() => ({ data: mockTeam, isLoading: false })),
  useTeamMutations: vi.fn(() => ({ deleteTeam: { mutateAsync: vi.fn() } })),
}));

// Permissions (configurable per test)
const perms: { canManageTeam: (teamId?: string) => boolean } = { canManageTeam: () => false };
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => perms),
}));

// Stub heavy child components
vi.mock('@/components/teams/TeamMembersList', () => ({
  default: () => <div>Members List</div>,
}));
vi.mock('@/components/teams/TeamMetadataEditor', () => ({
  default: ({ open }: { open: boolean }) => <div data-testid="metadata-editor">{open ? 'Open' : 'Closed'}</div>,
}));
vi.mock('@/components/teams/AddTeamMemberDialog', () => ({
  default: ({ open }: { open: boolean }) => <div data-testid="add-member-dialog">{open ? 'Open' : 'Closed'}</div>,
}));
vi.mock('@/components/teams/QuickBooksCustomerMapping', () => ({
  QuickBooksCustomerMapping: () => null,
  default: () => null,
}));

describe('TeamDetails permissions gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // default to cannot manage
    perms.canManageTeam = () => false;
  });

  it('hides Add Member button for users without manage permission', () => {
    render(<TeamDetails />);
    expect(screen.queryByText('Add Member')).toBeNull();
    expect(screen.queryByText('Edit Team')).toBeNull();
    expect(screen.queryByText('Delete Team')).toBeNull();
  });

  it('shows Add Member button for team managers', () => {
    perms.canManageTeam = () => true;
    render(<TeamDetails />);
    expect(screen.getByText('Add Member')).toBeInTheDocument();
  });

  it('shows Add Member button for organization admins (via permission hook)', () => {
    perms.canManageTeam = () => true; // permission layer should return true for admins
    render(<TeamDetails />);
    expect(screen.getByText('Add Member')).toBeInTheDocument();
  });
});
