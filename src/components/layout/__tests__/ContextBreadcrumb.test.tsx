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

// useIsMobile is mocked to keep the team segment visible across the suite.
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
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
});
