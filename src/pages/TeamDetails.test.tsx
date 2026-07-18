import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@vitest-harness/utils/test-utils';
import TeamDetails from '@/features/teams/pages/TeamDetails';

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

const mockUseTeam = vi.fn(() => ({ data: mockTeam, isLoading: false }));

vi.mock('@/features/teams/hooks/useTeamManagement', () => ({
  useTeam: (...args: unknown[]) => mockUseTeam(...args),
  useTeamMutations: vi.fn(() => ({ deleteTeam: { mutateAsync: vi.fn() } })),
}));

// Permissions (configurable per test)
const perms: { canManageTeam: (teamId?: string) => boolean } = { canManageTeam: () => false };
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => perms),
}));

// Stub heavy child components
vi.mock('@/features/teams/components/TeamMembersList', () => ({
  default: () => <div>Members List</div>,
}));
vi.mock('@/features/teams/components/TeamMetadataEditor', () => ({
  default: ({ open }: { open: boolean }) => <div data-testid="metadata-editor">{open ? 'Open' : 'Closed'}</div>,
}));
vi.mock('@/features/teams/components/AddTeamMemberDialog', () => ({
  default: ({ open }: { open: boolean }) => <div data-testid="add-member-dialog">{open ? 'Open' : 'Closed'}</div>,
}));
vi.mock('@/features/teams/components/QuickBooksCustomerMapping', () => ({
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

  it('renders Team not found card without crashing when team is missing (#1076)', () => {
    mockUseTeam.mockReturnValueOnce({ data: null, isLoading: false });
    render(<TeamDetails />);
    expect(screen.getByText('Team not found')).toBeInTheDocument();
    expect(screen.getByText('Back to Teams')).toBeInTheDocument();
    expect(screen.getByText('Return to Teams')).toBeInTheDocument();
  });
});

describe('TeamDetails dedicated views (#1132)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    perms.canManageTeam = () => false;
  });

  it('renders the view switcher with all three views', () => {
    render(<TeamDetails />);

    expect(screen.getByRole('radio', { name: /internal team view/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /department view/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /customer view/i })).toBeInTheDocument();
  });

  it('shows the link-a-customer hint on the customer view when no customer is linked', async () => {
    const user = userEvent.setup();
    render(<TeamDetails />);

    await user.click(screen.getByRole('radio', { name: /customer view/i }));

    expect(screen.getByText('No customer account linked')).toBeInTheDocument();
  });

  it('offers "Set as team default" to team managers after switching views', async () => {
    perms.canManageTeam = () => true;
    const user = userEvent.setup();
    render(<TeamDetails />);

    expect(screen.queryByRole('button', { name: /set as team default/i })).toBeNull();

    await user.click(screen.getByRole('radio', { name: /department view/i }));

    expect(screen.getByRole('button', { name: /set as team default/i })).toBeInTheDocument();
  });

  it('never offers "Set as team default" to non-managers', async () => {
    const user = userEvent.setup();
    render(<TeamDetails />);

    await user.click(screen.getByRole('radio', { name: /department view/i }));

    expect(screen.queryByRole('button', { name: /set as team default/i })).toBeNull();
  });
});
