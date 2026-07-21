import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TeamContext, type TeamMembership } from '@/contexts/team-context';
import {
  SelectedTeamContext,
  UNASSIGNED_TEAM_ID,
  type SelectedTeamId,
} from '@/contexts/selected-team-context';
import { SimpleOrganizationContext } from '@/contexts/SimpleOrganizationContext';
import { createMockSimpleOrgValue } from '@vitest-harness/utils/mock-provider-values';
import ContextBreadcrumb from './ContextBreadcrumb';

// useIsMobile is mocked through a hoisted ref so individual tests can flip
// the viewport without re-mocking. Default is desktop (false); the dedicated
// mobile test sets it to true before rendering.
const { mockIsMobileRef, mockCanCreateTeamRef } = vi.hoisted(() => ({
  mockIsMobileRef: { current: false },
  mockCanCreateTeamRef: { current: false },
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobileRef.current,
}));

// usePermissions is mocked so we can flip canCreateTeam without wiring a
// SessionProvider + AuthProvider into every render.
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canCreateTeam: () => mockCanCreateTeamRef.current,
  }),
}));

const { mockSelectedTeamImageUrlRef } = vi.hoisted(() => ({
  mockSelectedTeamImageUrlRef: { current: null as string | null },
}));

vi.mock('@/hooks/useSelectedTeamImageUrl', () => ({
  useSelectedTeamImageUrl: () => ({
    data: mockSelectedTeamImageUrlRef.current,
  }),
}));

// CreateTeamDialog is mocked so we don't pull in Google Maps loader, customer
// queries, or the team mutation hook chain in this lightweight breadcrumb
// test. The mock just renders a sentinel element when open=true so we can
// assert the dialog opens.
vi.mock('@/features/teams/components/CreateTeamDialog', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="create-team-dialog">
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}));

const renderWithTeamContext = (
  options: {
    teamMemberships?: TeamMembership[];
    selectedTeamId?: SelectedTeamId;
    setSelectedTeamId?: (id: SelectedTeamId) => void;
    initialEntries?: string[];
    orgValue?: ReturnType<typeof createMockSimpleOrgValue>;
  } = {},
) => {
  const teamMemberships = options.teamMemberships ?? [];
  const selectedTeamId = options.selectedTeamId ?? null;
  const setSelectedTeamId = options.setSelectedTeamId ?? vi.fn();
  const initialEntries = options.initialEntries ?? ['/'];
  const orgValue = options.orgValue ?? createMockSimpleOrgValue();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SimpleOrganizationContext.Provider value={orgValue}>
            <TeamContext.Provider
              value={{
                teamMemberships,
                isLoading: false,
                error: null,
                refetch: vi.fn().mockResolvedValue(undefined),
                hasTeamRole: () => false,
                hasTeamAccess: () => false,
                canManageTeam: () => false,
                getUserTeamIds: () => teamMemberships.map((m) => m.team_id),
              }}
            >
              <SelectedTeamContext.Provider
                value={{
                  selectedTeamId,
                  selectedTeam:
                    selectedTeamId && selectedTeamId !== UNASSIGNED_TEAM_ID
                      ? teamMemberships.find((m) => m.team_id === selectedTeamId) ?? null
                      : null,
                  setSelectedTeamId,
                }}
              >
                <ContextBreadcrumb />
              </SelectedTeamContext.Provider>
            </TeamContext.Provider>
          </SimpleOrganizationContext.Provider>
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

describe('ContextBreadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobileRef.current = false;
    mockCanCreateTeamRef.current = false;
    mockSelectedTeamImageUrlRef.current = null;
  });

  it('renders the section label resolved from the current route', () => {
    renderWithTeamContext({ initialEntries: ['/dashboard/equipment'] });
    expect(screen.getByText('Equipment')).toBeInTheDocument();
  });

  it('omits the team segment when the user has no team memberships', () => {
    renderWithTeamContext({
      teamMemberships: [],
      initialEntries: ['/dashboard/work-orders'],
    });

    expect(screen.queryByRole('button', { name: /switch team/i })).not.toBeInTheDocument();
    expect(screen.getByText('Work Orders')).toBeInTheDocument();
  });

  it('renders the "All teams" trigger when memberships exist but none is selected', () => {
    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
        { team_id: 't2', team_name: 'Parts', role: 'technician', joined_date: '2026-01-02' },
      ],
      initialEntries: ['/dashboard'],
    });

    expect(
      screen.getByRole('button', { name: /switch team \(current: all teams\)/i }),
    ).toBeInTheDocument();
  });

  it('renders the selected team name in the trigger', () => {
    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
        { team_id: 't2', team_name: 'Parts', role: 'technician', joined_date: '2026-01-02' },
      ],
      selectedTeamId: 't2',
      initialEntries: ['/dashboard'],
    });

    expect(
      screen.getByRole('button', { name: /switch team \(current: parts\)/i }),
    ).toBeInTheDocument();
  });

  it('shows org logo and selected team image in the desktop TopBar triggers', () => {
    mockSelectedTeamImageUrlRef.current = 'https://example.com/team.png';

    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Heavy Equipment Team', role: 'manager', joined_date: '2026-01-01' },
      ],
      selectedTeamId: 't1',
      initialEntries: ['/dashboard'],
      orgValue: createMockSimpleOrgValue({
        currentOrganization: {
          id: 'org-1',
          name: 'Apex Construction Company',
          plan: 'premium',
          memberCount: 5,
          maxMembers: 50,
          features: [],
          logo: 'https://example.com/org-logo.png',
          userRole: 'owner',
          userStatus: 'active',
        },
      }),
    });

    expect(
      screen.getByRole('img', { name: 'Apex Construction Company logo' }),
    ).toHaveAttribute('src', 'https://example.com/org-logo.png');
    expect(
      screen.getByRole('img', { name: 'Heavy Equipment Team team image' }),
    ).toHaveAttribute('src', 'https://example.com/team.png');
  });

  it('keeps generic icons when org logo and team image are absent', () => {
    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Site Operations Team', role: 'manager', joined_date: '2026-01-01' },
      ],
      selectedTeamId: 't1',
      initialEntries: ['/dashboard'],
    });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /switch organization \(current: test org\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /switch team \(current: site operations team\)/i }),
    ).toBeInTheDocument();
  });

  it('calls setSelectedTeamId when a team is chosen from the dropdown', async () => {
    const user = userEvent.setup();
    const setSelectedTeamId = vi.fn();
    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
        { team_id: 't2', team_name: 'Parts', role: 'technician', joined_date: '2026-01-02' },
      ],
      selectedTeamId: null,
      setSelectedTeamId,
      initialEntries: ['/dashboard'],
    });

    await user.click(screen.getByRole('button', { name: /switch team/i }));

    const partsItem = await screen.findByRole('menuitem', { name: /parts/i });
    await user.click(partsItem);

    expect(setSelectedTeamId).toHaveBeenCalledWith('t2');
  });

  it('clears the selection when "All teams" is chosen', async () => {
    const user = userEvent.setup();
    const setSelectedTeamId = vi.fn();
    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
      ],
      selectedTeamId: 't1',
      setSelectedTeamId,
      initialEntries: ['/dashboard'],
    });

    await user.click(screen.getByRole('button', { name: /switch team/i }));

    const allItem = await screen.findByRole('menuitem', { name: /all teams/i });
    await user.click(allItem);

    expect(setSelectedTeamId).toHaveBeenCalledWith(null);
  });

  it('renders an "Unassigned" item that selects the UNASSIGNED_TEAM_ID sentinel', async () => {
    const user = userEvent.setup();
    const setSelectedTeamId = vi.fn();
    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
      ],
      selectedTeamId: null,
      setSelectedTeamId,
      initialEntries: ['/dashboard'],
    });

    await user.click(screen.getByRole('button', { name: /switch team/i }));

    const unassignedItem = await screen.findByRole('menuitem', { name: /unassigned/i });
    await user.click(unassignedItem);

    expect(setSelectedTeamId).toHaveBeenCalledWith(UNASSIGNED_TEAM_ID);
  });

  it('shows "Unassigned" as the trigger label when the unassigned sentinel is current', () => {
    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
      ],
      selectedTeamId: UNASSIGNED_TEAM_ID,
      initialEntries: ['/dashboard'],
    });

    expect(
      screen.getByRole('button', { name: /switch team \(current: unassigned\)/i }),
    ).toBeInTheDocument();
  });

  it('renders a unified mobile workspace control with full org and team labels', () => {
    mockIsMobileRef.current = true;

    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
      ],
      initialEntries: ['/dashboard'],
    });

    expect(screen.getByText('Test Org')).toBeInTheDocument();
    expect(screen.getByText('All teams')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /workspace: test org, all teams/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /switch organization/i }),
    ).not.toBeInTheDocument();
  });

  it('shows side-by-side org and team avatars on mobile when both images exist', () => {
    mockIsMobileRef.current = true;
    mockSelectedTeamImageUrlRef.current = 'https://example.com/team.png';

    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Heavy Equipment Team', role: 'manager', joined_date: '2026-01-01' },
      ],
      selectedTeamId: 't1',
      initialEntries: ['/dashboard'],
      orgValue: createMockSimpleOrgValue({
        currentOrganization: {
          id: 'org-1',
          name: 'Apex Construction Company',
          plan: 'premium',
          memberCount: 5,
          maxMembers: 50,
          features: [],
          logo: 'https://example.com/org-logo.png',
          userRole: 'owner',
          userStatus: 'active',
        },
      }),
    });

    expect(
      screen.getByRole('img', { name: 'Apex Construction Company logo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Heavy Equipment Team team image' }),
    ).toBeInTheDocument();
  });

  it('closes the mobile workspace sheet after org switch and after team selection', async () => {
    mockIsMobileRef.current = true;
    const user = userEvent.setup();
    const switchOrganization = vi.fn();
    const setSelectedTeamId = vi.fn();

    const orgs = [
      {
        id: 'org-1',
        name: 'Apex Construction Company',
        plan: 'free' as const,
        memberCount: 1,
        maxMembers: 10,
        features: [],
        userRole: 'owner' as const,
        userStatus: 'active' as const,
      },
      {
        id: 'org-2',
        name: 'Metro Equipment Services',
        plan: 'free' as const,
        memberCount: 1,
        maxMembers: 10,
        features: [],
        userRole: 'member' as const,
        userStatus: 'active' as const,
      },
    ];

    renderWithTeamContext({
      teamMemberships: [
        {
          team_id: 't-heavy',
          team_name: 'Heavy Equipment Team',
          role: 'manager',
          joined_date: '2026-01-01',
        },
      ],
      setSelectedTeamId,
      initialEntries: ['/dashboard/equipment'],
      orgValue: {
        ...createMockSimpleOrgValue({
          organizations: orgs,
          currentOrganization: orgs[0],
          organizationId: orgs[0].id,
        }),
        switchOrganization,
      },
    });

    await user.click(
      screen.getByRole('button', {
        name: /workspace: apex construction company, all teams/i,
      }),
    );

    const sheet = screen.getByRole('dialog', { name: /workspace/i });
    expect(sheet).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /metro equipment services/i }),
    );

    expect(switchOrganization).toHaveBeenCalledWith('org-2');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /workspace/i })).not.toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', {
        name: /workspace: apex construction company, all teams/i,
      }),
    );

    await user.click(screen.getByRole('button', { name: /^all teams$/i }));

    expect(setSelectedTeamId).toHaveBeenCalledWith(null);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /workspace/i })).not.toBeInTheDocument();
    });
  });

  it('omits the brand-icon row on mobile H1 routes (logo lives in the sidebar trigger slot now)', () => {
    mockIsMobileRef.current = true;

    // /dashboard is a ROUTES_WITH_PAGE_H1 entry, so the section row used to
    // render the EquipQR brand icon as a third stacked row. After the fix,
    // the row should be omitted entirely — the page H1 already shows the
    // title and the logo lives in the sidebar-trigger slot.
    renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
      ],
      initialEntries: ['/dashboard'],
    });

    expect(screen.queryByAltText('EquipQR')).not.toBeInTheDocument();
  });

  describe('quick-create team button', () => {
    it('does NOT render the create-team button when the user lacks permission', async () => {
      const user = userEvent.setup();
      mockCanCreateTeamRef.current = false;

      renderWithTeamContext({
        teamMemberships: [
          { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
        ],
        initialEntries: ['/dashboard'],
      });

      await user.click(screen.getByRole('button', { name: /switch team/i }));

      expect(
        screen.queryByRole('button', { name: /create new team/i }),
      ).not.toBeInTheDocument();
    });

    it('renders the create-team button in the dropdown header for org admins/owners', async () => {
      const user = userEvent.setup();
      mockCanCreateTeamRef.current = true;

      renderWithTeamContext({
        teamMemberships: [
          { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
        ],
        initialEntries: ['/dashboard'],
      });

      await user.click(screen.getByRole('button', { name: /switch team/i }));

      const createButton = await screen.findByRole('button', { name: /create new team/i });
      expect(createButton).toBeInTheDocument();
      // Sanity check that the green/success token classes are applied so the
      // button visually pops as the design intent ("green + button").
      expect(createButton.className).toContain('bg-success');
    });

    it('opens the CreateTeamDialog when the green + button is clicked', async () => {
      const user = userEvent.setup();
      mockCanCreateTeamRef.current = true;

      renderWithTeamContext({
        teamMemberships: [
          { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
        ],
        initialEntries: ['/dashboard'],
      });

      await user.click(screen.getByRole('button', { name: /switch team/i }));
      const createButton = await screen.findByRole('button', { name: /create new team/i });
      await user.click(createButton);

      expect(await screen.findByTestId('create-team-dialog')).toBeInTheDocument();
    });

    it('exposes the team segment for org admins even when they have zero memberships', async () => {
      const user = userEvent.setup();
      mockCanCreateTeamRef.current = true;

      renderWithTeamContext({
        teamMemberships: [],
        initialEntries: ['/dashboard'],
      });

      // The trigger should still render so an org admin who hasn't joined any
      // team can reach the quick-create flow from the topbar.
      const trigger = screen.getByRole('button', { name: /switch team/i });
      expect(trigger).toBeInTheDocument();

      await user.click(trigger);
      expect(
        await screen.findByRole('button', { name: /create new team/i }),
      ).toBeInTheDocument();
    });
  });
});
