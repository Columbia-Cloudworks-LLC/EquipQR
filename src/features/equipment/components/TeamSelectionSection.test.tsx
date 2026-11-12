import React from 'react';
import { render, screen, fireEvent, within } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import TeamSelectionSection from './form/TeamSelectionSection';
import { equipmentFormSchema, EquipmentFormData } from '@/features/equipment/types/equipment';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import * as usePermissionsModule from '@/hooks/usePermissions';
import * as useTeamsModule from '@/features/teams/hooks/useTeams';

// Mock hooks
vi.mock('@/features/teams/hooks/useTeams', () => ({
  useTeams: vi.fn(() => ({
    teams: [
      { 
        id: 'team-1', 
        name: 'Team 1', 
        description: 'Description 1',
        organization_id: 'org-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        members: [],
        member_count: 0
      },
      { 
        id: 'team-2', 
        name: 'Team 2', 
        description: null,
        organization_id: 'org-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        members: [],
        member_count: 0
      }
    ],
    managedTeams: [
      { 
        id: 'team-1', 
        name: 'Team 1', 
        description: 'Description 1',
        organization_id: 'org-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        members: [],
        member_count: 0
      }
    ],
    isLoading: false,
    error: null
  }))
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canManageTeam: vi.fn(() => false),
    canViewTeam: vi.fn(() => true),
    canCreateTeam: vi.fn(() => false),
    canManageEquipment: vi.fn(() => false),
    canViewEquipment: vi.fn(() => true),
    canCreateEquipment: vi.fn(() => false),
    canCreateEquipmentForTeam: vi.fn(() => false),
    canCreateEquipmentForAnyTeam: vi.fn(() => false),
    canUpdateEquipmentStatus: vi.fn(() => false),
    canManageWorkOrder: vi.fn(() => false),
    canViewWorkOrder: vi.fn(() => true),
    canCreateWorkOrder: vi.fn(() => false),
    canAssignWorkOrder: vi.fn(() => false),
    canChangeWorkOrderStatus: vi.fn(() => false),
    canManageOrganization: vi.fn(() => false),
    canInviteMembers: vi.fn(() => false),
    isOrganizationAdmin: vi.fn(() => false),
    hasRole: vi.fn(() => false),
    isTeamMember: vi.fn(() => true),
    isTeamManager: vi.fn(() => false)
  }))
}));

type TeamsQuery = ReturnType<typeof useTeamsModule.useTeams>;
type TeamWithMembers = TeamsQuery['teams'][number];
type PermissionsResult = ReturnType<typeof usePermissionsModule.usePermissions>;

const createTeam = (id: string, name: string, description: string | null): TeamWithMembers => ({
  id,
  name,
  description,
  organization_id: 'org-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  customer_id: null,
  image_url: null,
  location_address: null,
  location_city: null,
  location_country: null,
  location_lat: null,
  location_lng: null,
  location_state: null,
  override_equipment_location: false,
  preferred_view: 'list',
  team_lead_id: null,
  members: [],
  member_count: 0,
});

const team1 = createTeam('team-1', 'Team 1', 'Description 1');
const team2 = createTeam('team-2', 'Team 2', null);

const createTeamsQuery = (
  teams: TeamWithMembers[],
  managedTeams: TeamWithMembers[],
  isLoading: boolean,
): TeamsQuery => {
  const base = {
    teams,
    managedTeams,
    error: null,
    isError: false as const,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetchedAfterMount: !isLoading,
    isInitialLoading: isLoading,
    isLoadingError: false as const,
    isPaused: false,
    isPlaceholderData: false as const,
    isRefetchError: false as const,
    isRefetching: false,
    isStale: false,
    isEnabled: true,
    refetch: vi.fn(),
  };
  if (isLoading) {
    return {
      ...base,
      data: undefined,
      isLoading: true,
      isPending: true,
      isSuccess: false,
      status: 'pending',
      fetchStatus: 'fetching',
      isFetched: false,
      isFetching: true,
    };
  }
  return {
    ...base,
    data: teams,
    isLoading: false,
    isPending: false,
    isSuccess: true,
    status: 'success',
    fetchStatus: 'idle',
    isFetched: true,
    isFetching: false,
  };
};

const createPermissions = (
  overrides: { isAdmin: boolean; canCreateForTeam: (teamId: string) => boolean; canCreateForAnyTeam: boolean },
): PermissionsResult => {
  const { isAdmin, canCreateForTeam, canCreateForAnyTeam } = overrides;
  return {
    canManageTeam: vi.fn(() => isAdmin),
    canViewTeam: vi.fn(() => true),
    canCreateTeam: vi.fn(() => isAdmin),
    canManageEquipment: vi.fn(() => isAdmin),
    canViewEquipment: vi.fn(() => true),
    canCreateEquipment: vi.fn(() => isAdmin),
    canCreateEquipmentForTeam: vi.fn(canCreateForTeam),
    canCreateEquipmentForAnyTeam: vi.fn(() => canCreateForAnyTeam),
    canUpdateEquipmentStatus: vi.fn(() => isAdmin),
    canManageWorkOrder: vi.fn(() => isAdmin),
    canViewWorkOrder: vi.fn(() => true),
    canCreateWorkOrder: vi.fn(() => isAdmin),
    canAssignWorkOrder: vi.fn(() => isAdmin),
    canChangeWorkOrderStatus: vi.fn(() => isAdmin),
    canManageOrganization: vi.fn(() => isAdmin),
    canInviteMembers: vi.fn(() => isAdmin),
    isOrganizationAdmin: vi.fn(() => isAdmin),
    canManageInventory: vi.fn(() => isAdmin),
    canViewInventory: vi.fn(() => true),
    canManagePartsManagers: vi.fn(() => isAdmin),
    canManagePartsConsumers: vi.fn(() => isAdmin),
    hasRole: vi.fn((roles: string | string[]) => {
      const roleList = Array.isArray(roles) ? roles : [roles];
      return isAdmin && (roleList.includes('owner') || roleList.includes('admin'));
    }),
    isTeamMember: vi.fn(() => true),
    isTeamManager: vi.fn(() => isAdmin),
  };
};

interface TestWrapperProps {
  defaultValues?: Partial<EquipmentFormData>;
  isAdmin?: boolean;
  /**
   * Set of team IDs the non-admin persona can create equipment for.
   * Defaults to ['team-1'] so the existing non-admin tests still see at
   * least one creatable team without changing per-test setup.
   */
  creatableTeamIds?: ReadonlyArray<string>;
}

const TestWrapper = ({ defaultValues, isAdmin = false, creatableTeamIds = ['team-1'] }: TestWrapperProps) => {
  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      status: 'active',
      location: '',
      team_id: '',
      ...defaultValues
    }
  });

  // Mock permissions based on isAdmin prop
  vi.mocked(usePermissionsModule.usePermissions).mockReturnValue(
    createPermissions({
      isAdmin,
      canCreateForTeam: (teamId: string) => isAdmin || creatableTeamIds.includes(teamId),
      canCreateForAnyTeam: isAdmin || creatableTeamIds.length > 0,
    }),
  );

  return (
    <Form {...form}>
      <TeamSelectionSection form={form} />
    </Form>
  );
};

describe('TeamSelectionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTeamsModule.useTeams).mockReturnValue(createTeamsQuery([team1, team2], [team1], false));
    vi.mocked(usePermissionsModule.usePermissions).mockReturnValue(
      createPermissions({
        isAdmin: false,
        canCreateForTeam: (teamId: string) => teamId === 'team-1',
        canCreateForAnyTeam: true,
      }),
    );
  });

  describe('Core Rendering', () => {
    it('renders section title', () => {
      render(<TestWrapper />);
      
      expect(screen.getByText('Team Assignment')).toBeInTheDocument();
    });

    it('renders team selection field', () => {
      render(<TestWrapper />);
      
      expect(screen.getByText(/Assign to Team/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state when teams are loading', () => {
      vi.mocked(useTeamsModule.useTeams).mockReturnValue(createTeamsQuery([], [], true));

      render(<TestWrapper />);
      
      expect(screen.getByText('Loading teams...')).toBeInTheDocument();
    });
  });

  describe('Admin vs Non-Admin', () => {
    it('shows unassigned label for admins by default', () => {
      render(<TestWrapper isAdmin={true} />);

      expect(screen.getByText('No team assigned')).toBeInTheDocument();
    });

    it('shows required placeholder for non-admins', () => {
      render(<TestWrapper isAdmin={false} />);
      
      expect(screen.getByText('Select a team')).toBeInTheDocument();
    });

    it('shows "unassigned" option for admins', async () => {
      render(<TestWrapper isAdmin={true} />);
      
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      
      // Wait for the dropdown to appear
      const listbox = await screen.findByRole('listbox');
      const unassignedOption = within(listbox).getByRole('option', { name: 'No team assigned' });
      
      expect(unassignedOption).toBeInTheDocument();
    });

    it('shows helper text for non-admins', () => {
      render(<TestWrapper isAdmin={false} />);

      expect(
        screen.getByText(/You can only assign equipment to teams where you are a manager or technician/)
      ).toBeInTheDocument();
    });

    // #650: when a non-admin user has no manager/technician membership on
    // any team, surface the explicit "no eligible teams" message rather
    // than the standard helper text.
    it('shows no-eligible-teams message for non-admins with zero creatable teams', () => {
      render(<TestWrapper isAdmin={false} creatableTeamIds={[]} />);

      expect(
        screen.getByText(/You must be a team manager or technician on at least one team to create equipment/)
      ).toBeInTheDocument();
    });
  });

  describe('Team Options', () => {
    it('displays team names in dropdown', async () => {
      render(<TestWrapper isAdmin={true} />);

      fireEvent.click(screen.getByRole('combobox'));
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByRole('option', { name: /Team 1/ })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: /Team 2/ })).toBeInTheDocument();
    });

    it('displays team descriptions when available', async () => {
      render(<TestWrapper isAdmin={true} />);

      fireEvent.click(screen.getByRole('combobox'));
      const listbox = await screen.findByRole('listbox');
      // Team 1 has a description; Team 2's is null.
      expect(within(listbox).getByRole('option', { name: /Team 1/ })).toHaveTextContent('- Description 1');
      expect(within(listbox).getByRole('option', { name: /Team 2/ })).not.toHaveTextContent('-');
    });
  });

  describe('Layout', () => {
    it('renders in a Card component', () => {
      const { container } = render(<TestWrapper />);
      
      const card = container.querySelector('[class*="card"]');
      expect(card).toBeInTheDocument();
    });
  });
});
