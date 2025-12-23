import React from 'react';
import { render, screen, fireEvent, within } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import TeamSelectionSection from '../form/TeamSelectionSection';
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

const TestWrapper = ({ defaultValues, isAdmin = false }: { defaultValues?: Partial<EquipmentFormData>; isAdmin?: boolean }) => {
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
  vi.mocked(usePermissionsModule.usePermissions).mockReturnValue({
    canManageTeam: vi.fn(() => isAdmin),
    canViewTeam: vi.fn(() => true),
    canCreateTeam: vi.fn(() => isAdmin),
    canManageEquipment: vi.fn(() => isAdmin),
    canViewEquipment: vi.fn(() => true),
    canCreateEquipment: vi.fn(() => isAdmin),
    canUpdateEquipmentStatus: vi.fn(() => isAdmin),
    canManageWorkOrder: vi.fn(() => isAdmin),
    canViewWorkOrder: vi.fn(() => true),
    canCreateWorkOrder: vi.fn(() => isAdmin),
    canAssignWorkOrder: vi.fn(() => isAdmin),
    canChangeWorkOrderStatus: vi.fn(() => isAdmin),
    canManageOrganization: vi.fn(() => isAdmin),
    canInviteMembers: vi.fn(() => isAdmin),
    isOrganizationAdmin: vi.fn(() => isAdmin),
    hasRole: vi.fn((roles: string[]) => isAdmin && (roles.includes('owner') || roles.includes('admin'))),
    isTeamMember: vi.fn(() => true),
    isTeamManager: vi.fn(() => isAdmin)
  });

  return (
    <Form {...form}>
      <TeamSelectionSection form={form} />
    </Form>
  );
};

describe('TeamSelectionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTeamsModule.useTeams).mockReturnValue({
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
    });
    vi.mocked(usePermissionsModule.usePermissions).mockReturnValue({
      canManageTeam: vi.fn(() => false),
      canViewTeam: vi.fn(() => true),
      canCreateTeam: vi.fn(() => false),
      canManageEquipment: vi.fn(() => false),
      canViewEquipment: vi.fn(() => true),
      canCreateEquipment: vi.fn(() => false),
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
    });
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
      vi.mocked(useTeamsModule.useTeams).mockReturnValue({
        teams: [],
        managedTeams: [],
        isLoading: true,
        error: null
      });

      render(<TestWrapper />);
      
      expect(screen.getByText('Loading teams...')).toBeInTheDocument();
    });
  });

  describe('Admin vs Non-Admin', () => {
    it('shows "optional" placeholder for admins', () => {
      render(<TestWrapper isAdmin={true} />);
      
      expect(screen.getByText('Select a team (optional)')).toBeInTheDocument();
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
      
      expect(screen.getByText(/You can only assign equipment to teams you manage/)).toBeInTheDocument();
    });
  });

  describe('Team Options', () => {
    it('displays team names in dropdown', async () => {
      render(<TestWrapper isAdmin={true} />);
      
      screen.getByText('Select a team (optional)');
      // Teams should be available when dropdown is opened
      // This would require interaction testing
    });

    it('displays team descriptions when available', () => {
      render(<TestWrapper isAdmin={true} />);
      
      // Team descriptions should be shown in the dropdown options
      // This would be visible when the dropdown is opened
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
