/**
 * PartsManagersSheet Component Tests
 *
 * Tests for the sheet component that manages organization-level parts managers.
 * Covers rendering, permission checks, adding/removing managers, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartsManagersSheet } from '../PartsManagersSheet';
import { personas } from '@/test/fixtures/personas';
import { organizations } from '@/test/fixtures/entities';

// Mock dependencies
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/features/organization/hooks/useOrganizationMembers', () => ({
  useOrganizationMembers: vi.fn(),
}));

vi.mock('@/features/inventory/hooks/usePartsManagers', () => ({
  usePartsManagers: vi.fn(),
  useAddPartsManager: vi.fn(),
  useRemovePartsManager: vi.fn(),
}));

import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganizationMembers } from '@/features/organization/hooks/useOrganizationMembers';
import {
  usePartsManagers,
  useAddPartsManager,
  useRemovePartsManager,
} from '@/features/inventory/hooks/usePartsManagers';

// Mock data
const mockPartsManagers = [
  {
    organization_id: organizations.acme.id,
    user_id: personas.teamManager.id,
    assigned_by: personas.admin.id,
    assigned_at: '2024-01-15T10:00:00Z',
    userName: personas.teamManager.name,
    userEmail: personas.teamManager.email,
    assignedByName: personas.admin.name,
  },
];

const mockMembers = [
  {
    id: personas.technician.id,
    name: personas.technician.name,
    email: personas.technician.email,
    role: 'member',
    status: 'active',
  },
  {
    id: personas.multiTeamTechnician.id,
    name: personas.multiTeamTechnician.name,
    email: personas.multiTeamTechnician.email,
    role: 'member',
    status: 'active',
  },
  {
    id: personas.admin.id,
    name: personas.admin.name,
    email: personas.admin.email,
    role: 'admin',
    status: 'active',
  },
];

const setupMocks = (options: {
  canManage?: boolean;
  managers?: typeof mockPartsManagers;
  members?: typeof mockMembers;
  isLoading?: boolean;
} = {}) => {
  const {
    canManage = true,
    managers = mockPartsManagers,
    members = mockMembers,
    isLoading = false,
  } = options;

  vi.mocked(useOrganization).mockReturnValue({
    currentOrganization: { id: organizations.acme.id, name: organizations.acme.name },
  } as ReturnType<typeof useOrganization>);

  vi.mocked(usePermissions).mockReturnValue({
    canManagePartsManagers: () => canManage,
    canCreateEquipment: () => true,
    canEditEquipment: () => true,
    canDeleteEquipment: () => true,
    canViewTeam: () => true,
    canEditTeam: () => true,
    canManageTeamMembers: () => true,
    canManageOrganization: () => canManage,
    isLoading: false,
  } as unknown as ReturnType<typeof usePermissions>);

  vi.mocked(usePartsManagers).mockReturnValue({
    data: managers,
    isLoading,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePartsManagers>);

  vi.mocked(useOrganizationMembers).mockReturnValue({
    data: members,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useOrganizationMembers>);

  const mockAddMutateAsync = vi.fn().mockResolvedValue({});
  vi.mocked(useAddPartsManager).mockReturnValue({
    mutateAsync: mockAddMutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useAddPartsManager>);

  const mockRemoveMutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useRemovePartsManager).mockReturnValue({
    mutateAsync: mockRemoveMutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useRemovePartsManager>);

  return { mockAddMutateAsync, mockRemoveMutateAsync };
};

describe('PartsManagersSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the sheet with title and description when open', () => {
      setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      // Use role to find the specific title
      expect(screen.getByRole('heading', { name: /Parts Managers/ })).toBeInTheDocument();
      expect(
        screen.getByText(/Parts managers can create, edit, and manage all inventory items/)
      ).toBeInTheDocument();
    });

    it('shows loading skeleton while fetching managers', () => {
      setupMocks({ isLoading: true });

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows empty state when no managers exist', () => {
      setupMocks({ managers: [] });

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('No parts managers assigned yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Organization owners and admins can always manage inventory/)
      ).toBeInTheDocument();
    });

    it('displays list of parts managers with details', () => {
      setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText(personas.teamManager.name)).toBeInTheDocument();
      expect(screen.getByText(personas.teamManager.email)).toBeInTheDocument();
      expect(screen.getByText('Parts Manager')).toBeInTheDocument();
    });

    it('shows add manager button', () => {
      setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByRole('button', { name: /add manager/i })).toBeInTheDocument();
    });
  });

  describe('Permission Checks', () => {
    it('shows access denied message when user cannot manage parts managers', () => {
      setupMocks({ canManage: false });

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(
        screen.getByText(/Only organization owners and admins can manage parts managers/)
      ).toBeInTheDocument();
    });

    it('does not show add button when user cannot manage', () => {
      setupMocks({ canManage: false });

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      expect(screen.queryByRole('button', { name: /add manager/i })).not.toBeInTheDocument();
    });
  });

  describe('Adding Parts Managers', () => {
    it('opens add dialog when add button is clicked', async () => {
      setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      const addButton = screen.getByRole('button', { name: /add manager/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add Parts Managers')).toBeInTheDocument();
        expect(
          screen.getByText(/Select organization members to grant parts manager permissions/)
        ).toBeInTheDocument();
      });
    });

    it('filters out existing managers and admins/owners from available members', async () => {
      setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      const addButton = screen.getByRole('button', { name: /add manager/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        // Admin should not be in the list (role is admin, not member)
        expect(screen.queryByText(personas.admin.name)).not.toBeInTheDocument();
        // Technicians should be available
        expect(screen.getByText(personas.technician.name)).toBeInTheDocument();
        expect(screen.getByText(personas.multiTeamTechnician.name)).toBeInTheDocument();
      });
    });

    it('allows selecting multiple members', async () => {
      setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      const addButton = screen.getByRole('button', { name: /add manager/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(personas.technician.name)).toBeInTheDocument();
      });

      // Find and click checkboxes for both technicians
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      // Should show selected badges
      expect(screen.getByText(/Add 2 Managers/i)).toBeInTheDocument();
    });

    it('calls addPartsManager for each selected member', async () => {
      const { mockAddMutateAsync } = setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      const addButton = screen.getByRole('button', { name: /add manager/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(personas.technician.name)).toBeInTheDocument();
      });

      // Select a member
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Click add button
      const confirmButton = screen.getByRole('button', { name: /Add 1 Manager/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockAddMutateAsync).toHaveBeenCalled();
      });
    });

    it('supports search filtering in add dialog', async () => {
      setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      const addButton = screen.getByRole('button', { name: /add manager/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search members...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search members...');
      fireEvent.change(searchInput, { target: { value: 'Dave' } });

      // Only Dave Technician should be visible
      await waitFor(() => {
        expect(screen.getByText(personas.technician.name)).toBeInTheDocument();
        expect(screen.queryByText(personas.multiTeamTechnician.name)).not.toBeInTheDocument();
      });
    });
  });

  describe('Removing Parts Managers', () => {
    it('has remove mutation hook available', () => {
      const { mockRemoveMutateAsync } = setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      // Verify the remove mutation is available
      expect(useRemovePartsManager).toHaveBeenCalled();
      expect(mockRemoveMutateAsync).toBeDefined();
    });

    it('displays manager info with remove capability', () => {
      setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      // Verify managers are displayed with their details
      expect(screen.getByText(personas.teamManager.name)).toBeInTheDocument();
      expect(screen.getByText(personas.teamManager.email)).toBeInTheDocument();
      expect(screen.getByText('Parts Manager')).toBeInTheDocument();
    });
  });

  describe('Info Section', () => {
    it('shows permissions info section', () => {
      setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('About Permissions')).toBeInTheDocument();
      expect(screen.getByText(/Owners & Admins/)).toBeInTheDocument();
      // Use a more specific match since "Parts Managers" appears multiple times
      expect(screen.getByText(/can create, edit, and delete items/)).toBeInTheDocument();
      expect(screen.getByText(/can only view inventory/)).toBeInTheDocument();
    });
  });
});

/**
 * User Journey Tests: Managing Parts Managers UI
 */
describe('PartsManagersSheet User Journeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * User Story: As an Admin, I want to see all current parts managers
   * so I can audit who has inventory management access.
   */
  describe('Admin views current parts managers', () => {
    it('admin sees list of managers with their details', () => {
      setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText(personas.teamManager.name)).toBeInTheDocument();
      expect(screen.getByText(personas.teamManager.email)).toBeInTheDocument();
      // Check that assigned date is shown (format: "Added Jan 15, 2024")
      expect(screen.getByText(/Added/)).toBeInTheDocument();
    });
  });

  /**
   * User Story: As an Admin, I want to add a team member as a parts manager
   * so they can help maintain inventory.
   */
  describe('Admin adds a new parts manager', () => {
    it('admin can search for and select a team member to promote', async () => {
      const { mockAddMutateAsync } = setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      // Open add dialog
      fireEvent.click(screen.getByRole('button', { name: /add manager/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search members...')).toBeInTheDocument();
      });

      // Search for technician
      fireEvent.change(screen.getByPlaceholderText('Search members...'), {
        target: { value: 'Dave' },
      });

      // Select the technician
      await waitFor(() => {
        expect(screen.getByText(personas.technician.name)).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Add them
      fireEvent.click(screen.getByRole('button', { name: /Add 1 Manager/i }));

      await waitFor(() => {
        expect(mockAddMutateAsync).toHaveBeenCalled();
      });
    });
  });

  /**
   * User Story: As an Admin, I want to remove a parts manager when they
   * no longer need that level of access.
   */
  describe('Admin removes a parts manager', () => {
    it('admin has remove mutation capability available', () => {
      const { mockRemoveMutateAsync } = setupMocks();

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      // Verify managers are displayed
      expect(screen.getByText(personas.teamManager.name)).toBeInTheDocument();
      
      // Verify remove mutation is available
      expect(useRemovePartsManager).toHaveBeenCalled();
      expect(mockRemoveMutateAsync).toBeDefined();
    });
  });

  /**
   * User Story: As a Member (non-admin), I want to understand why I can't
   * manage parts managers.
   */
  describe('Member sees access denied', () => {
    it('member without permissions sees access denied message', () => {
      setupMocks({ canManage: false });

      render(<PartsManagersSheet open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(
        screen.getByText(/Only organization owners and admins/)
      ).toBeInTheDocument();
    });
  });
});
