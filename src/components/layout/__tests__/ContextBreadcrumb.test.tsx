import React from 'react';
import { render, screen } from '@testing-library/react';
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
import { createMockSimpleOrgValue } from '@/test/utils/mock-provider-values';
import ContextBreadcrumb from '../ContextBreadcrumb';

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
  } = {},
) => {
  const teamMemberships = options.teamMemberships ?? [];
  const selectedTeamId = options.selectedTeamId ?? null;
  const setSelectedTeamId = options.setSelectedTeamId ?? vi.fn();
  const initialEntries = options.initialEntries ?? ['/'];

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SimpleOrganizationContext.Provider value={createMockSimpleOrgValue()}>
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

  it('keeps the team switcher reachable on mobile and stacks the breadcrumb vertically', () => {
    mockIsMobileRef.current = true;

    const { container } = renderWithTeamContext({
      teamMemberships: [
        { team_id: 't1', team_name: 'Service', role: 'manager', joined_date: '2026-01-01' },
      ],
      initialEntries: ['/dashboard'],
    });

    // The team switcher must still be present on mobile (regression guard for
    // the bug where !isMobile gated the segment off entirely on phones).
    expect(
      screen.getByRole('button', { name: /switch team/i }),
    ).toBeInTheDocument();

    // The breadcrumb list should stack vertically on mobile so the team row
    // sits directly below the org row.
    const list = container.querySelector('ol');
    expect(list).not.toBeNull();
    expect(list?.className).toContain('flex-col');
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
