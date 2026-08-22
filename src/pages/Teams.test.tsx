import React from 'react';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Teams from '@/features/teams/pages/Teams';
import { personas, type UserPersona } from '@vitest-harness/fixtures/personas';
import { teams as teamFixtures, organizations } from '@vitest-harness/fixtures/entities';
import type { TeamWithMembers } from '@/features/teams/types/team';

vi.mock('@/features/teams/components/CreateTeamDialog', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="team-form-modal">
        <button onClick={onClose}>Close Form</button>
      </div>
    ) : null
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/features/teams/hooks/useTeams', () => ({
  useTeams: vi.fn()
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn()
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganization: vi.fn()
}));

import { useTeams } from '@/features/teams/hooks/useTeams';
import { usePermissions } from '@/hooks/usePermissions';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';

const mockUseTeams = vi.mocked(useTeams);
const mockUsePermissions = vi.mocked(usePermissions);
const mockUseSimpleOrganization = vi.mocked(useSimpleOrganization);

const teamRowDefaults = {
  image_url: null,
  customer_id: null,
  override_equipment_location: false,
  preferred_view: 'internal',
  team_lead_id: null,
  location_address: null,
  location_city: null,
  location_state: null,
  location_country: null,
  location_lat: null,
  location_lng: null,
} as const;

// Realistic team based on entity fixtures
const maintenanceTeam: TeamWithMembers = {
  id: teamFixtures.maintenance.id,
  name: teamFixtures.maintenance.name,
  description: teamFixtures.maintenance.description,
  organization_id: teamFixtures.maintenance.organization_id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...teamRowDefaults,
  members: [
    {
      id: 'membership-1',
      user_id: personas.teamManager.id,
      team_id: teamFixtures.maintenance.id,
      role: 'manager',
      joined_date: '2024-01-01T00:00:00Z',
      profiles: { name: personas.teamManager.name, email: personas.teamManager.email }
    },
    {
      id: 'membership-2',
      user_id: personas.technician.id,
      team_id: teamFixtures.maintenance.id,
      role: 'technician',
      joined_date: '2024-01-01T00:00:00Z',
      profiles: { name: personas.technician.name, email: personas.technician.email }
    }
  ],
  member_count: 2
};

const fieldTeam: TeamWithMembers = {
  id: teamFixtures.field.id,
  name: teamFixtures.field.name,
  description: teamFixtures.field.description,
  organization_id: teamFixtures.field.organization_id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...teamRowDefaults,
  members: [],
  member_count: 0
};

// ============================================
// Helpers
// ============================================

function setupAsPersona(persona: UserPersona, options?: { canCreate?: boolean; teams?: TeamWithMembers[] }) {
  const isAdmin = persona.organizationRole === 'owner' || persona.organizationRole === 'admin';
  const canCreate = options?.canCreate ?? isAdmin;
  const teams = options?.teams ?? [];

  mockUseSimpleOrganization.mockReturnValue({
    currentOrganization: {
      id: organizations.acme.id,
      name: organizations.acme.name,
      plan: 'premium',
      memberCount: organizations.acme.memberCount,
      maxMembers: organizations.acme.maxMembers,
      features: [...organizations.acme.features],
      scanLocationCollectionEnabled: true,
      userRole: persona.organizationRole as 'owner' | 'admin' | 'member',
      userStatus: 'active' as const
    },
    organizationId: organizations.acme.id,
    organizations: [],
    userOrganizations: [],
    setCurrentOrganization: vi.fn(),
    switchOrganization: vi.fn(),
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined)
  });

  mockUsePermissions.mockReturnValue({
    canManageTeam: () => isAdmin,
    canViewTeam: () => true,
    canCreateTeam: () => canCreate,
    canManageEquipment: () => isAdmin,
    canViewEquipment: () => true,
    canCreateEquipment: () => isAdmin,
    canCreateEquipmentForTeam: () => isAdmin,
    canCreateEquipmentForAnyTeam: () => isAdmin,
    canUpdateEquipmentStatus: () => isAdmin,
    canManageWorkOrder: () => isAdmin,
    canViewWorkOrder: () => true,
    canCreateWorkOrder: () => true,
    canAssignWorkOrder: () => isAdmin,
    canChangeWorkOrderStatus: () => isAdmin,
    canManageOrganization: () => persona.organizationRole === 'owner',
    canInviteMembers: () => isAdmin,
    canManageInventory: () => isAdmin,
    canViewInventory: () => true,
    canManagePartsManagers: () => isAdmin,
    canManagePartsConsumers: () => isAdmin,
    isOrganizationAdmin: () => isAdmin,
    hasRole: () => isAdmin,
    isTeamMember: () => persona.teamMemberships.length > 0,
    isTeamManager: () => persona.teamMemberships.some(tm => tm.role === 'manager')
  });

  mockUseTeams.mockReturnValue({
    teams,
    managedTeams: isAdmin ? teams : [],
    isLoading: false,
    error: null,
  } as never);
}

// ============================================
// Persona-Driven Tests
// ============================================

describe('Teams Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  // --------------------------------------------------------
  // Alice Owner — full team management
  // --------------------------------------------------------
  describe('as Alice Owner managing all teams', () => {
    beforeEach(() => {
      setupAsPersona(personas.owner, { teams: [maintenanceTeam, fieldTeam] });
    });

    it('displays all organization teams', () => {
      render(<Teams />);
      expect(screen.getByText(teamFixtures.maintenance.name)).toBeInTheDocument();
      expect(screen.getByText(teamFixtures.field.name)).toBeInTheDocument();
    });

    it('shows the "Create Team" button', () => {
      render(<Teams />);
      expect(screen.getByRole('button', { name: /create team/i })).toBeInTheDocument();
    });

    it('opens team creation dialog when button is clicked', () => {
      render(<Teams />);
      fireEvent.click(screen.getByRole('button', { name: /create team/i }));
      expect(screen.getByTestId('team-form-modal')).toBeInTheDocument();
    });

    it('navigates to team details when a team card is clicked', async () => {
      const user = userEvent.setup();
      render(<Teams />);
      await user.click(screen.getByText(teamFixtures.maintenance.name));
      expect(mockNavigate).toHaveBeenCalledWith(`/dashboard/teams/${teamFixtures.maintenance.id}`);
    });

    it('renders team descriptions', () => {
      render(<Teams />);
      expect(screen.getByText(teamFixtures.maintenance.description)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Dave Technician — view-only, cannot create teams
  // --------------------------------------------------------
  describe('as Dave Technician viewing teams', () => {
    beforeEach(() => {
      setupAsPersona(personas.technician, { canCreate: false, teams: [maintenanceTeam] });
    });

    it('sees the team they belong to', () => {
      render(<Teams />);
      expect(screen.getByText(teamFixtures.maintenance.name)).toBeInTheDocument();
    });

    it('does NOT show the create team button', () => {
      render(<Teams />);
      expect(screen.queryByRole('button', { name: /create team/i })).not.toBeInTheDocument();
    });

    it('can navigate to team details', async () => {
      const user = userEvent.setup();
      render(<Teams />);
      await user.click(screen.getByText(teamFixtures.maintenance.name));
      expect(mockNavigate).toHaveBeenCalledWith(`/dashboard/teams/${teamFixtures.maintenance.id}`);
    });
  });

  // --------------------------------------------------------
  // Frank (read-only member) — no teams at all
  // --------------------------------------------------------
  describe('as Frank (read-only member with no teams)', () => {
    beforeEach(() => {
      setupAsPersona(personas.readOnlyMember, { canCreate: false, teams: [] });
    });

    it('shows the empty state', () => {
      render(<Teams />);
      expect(screen.getByText('No teams yet')).toBeInTheDocument();
    });

    it('does NOT show the create team button', () => {
      render(<Teams />);
      expect(screen.queryByRole('button', { name: /create team/i })).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Loading state
  // --------------------------------------------------------
  describe('while teams are loading', () => {
    beforeEach(() => {
      setupAsPersona(personas.owner);
      mockUseTeams.mockReturnValue({
        teams: [],
        managedTeams: [],
        isLoading: true,
        error: null,
      } as never);
    });

    it('shows loading skeleton cards', () => {
      render(<Teams />);
      expect(screen.getByTestId('teams-loading')).toBeInTheDocument();
    });
  });
});
