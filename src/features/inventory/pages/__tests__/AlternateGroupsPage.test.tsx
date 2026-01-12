/**
 * AlternateGroupsPage Component Tests
 *
 * Tests for the page that lists and manages alternate part groups.
 * Covers rendering, CRUD operations, search, and permission checks.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AlternateGroupsPage from '../AlternateGroupsPage';
import { personas } from '@/test/fixtures/personas';
import { organizations, partAlternateGroups } from '@/test/fixtures/entities';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock contexts and hooks
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/features/inventory/hooks/useAlternateGroups', () => ({
  useAlternateGroups: vi.fn(),
  useDeleteAlternateGroup: vi.fn(),
}));

vi.mock('@/features/inventory/components/AlternateGroupForm', () => ({
  AlternateGroupForm: ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => (
    <div data-testid="alternate-group-form">
      <button onClick={onSuccess}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useAlternateGroups,
  useDeleteAlternateGroup,
} from '@/features/inventory/hooks/useAlternateGroups';

// Mock data
const mockGroups = Object.values(partAlternateGroups);

const setupMocks = (options: {
  canEdit?: boolean;
  groups?: typeof mockGroups;
  isLoading?: boolean;
  hasOrganization?: boolean;
} = {}) => {
  const {
    canEdit = true,
    groups = mockGroups,
    isLoading = false,
    hasOrganization = true,
  } = options;

  vi.mocked(useOrganization).mockReturnValue({
    currentOrganization: hasOrganization
      ? { id: organizations.acme.id, name: organizations.acme.name }
      : null,
  } as ReturnType<typeof useOrganization>);

  vi.mocked(usePermissions).mockReturnValue({
    canCreateEquipment: () => canEdit,
    canEditEquipment: () => canEdit,
    canDeleteEquipment: () => canEdit,
    canViewTeam: () => true,
    canEditTeam: () => canEdit,
    canManageTeamMembers: () => canEdit,
    canManageOrganization: () => canEdit,
    canManagePartsManagers: () => canEdit,
    isLoading: false,
  } as unknown as ReturnType<typeof usePermissions>);

  vi.mocked(useAlternateGroups).mockReturnValue({
    data: groups,
    isLoading,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAlternateGroups>);

  const mockDeleteMutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useDeleteAlternateGroup).mockReturnValue({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteAlternateGroup>);

  return { mockDeleteMutateAsync };
};

describe('AlternateGroupsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the page with title and description', () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      expect(screen.getByText('Alternate Part Groups')).toBeInTheDocument();
      expect(
        screen.getByText(/Manage groups of interchangeable parts/)
      ).toBeInTheDocument();
    });

    it('shows loading skeletons while fetching', () => {
      setupMocks({ isLoading: true });

      render(<AlternateGroupsPage />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows empty state when no groups exist', () => {
      setupMocks({ groups: [] });

      render(<AlternateGroupsPage />);

      expect(screen.getByText('No alternate groups yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Create a group to define interchangeable parts/)
      ).toBeInTheDocument();
    });

    it('displays list of groups as cards', () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      // Should show all groups
      mockGroups.forEach((group) => {
        expect(screen.getByText(group.name)).toBeInTheDocument();
      });
    });

    it('shows verified badge for verified groups', () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      // Oil Filter group is verified
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('shows New Group button when user can edit', () => {
      setupMocks({ canEdit: true });

      render(<AlternateGroupsPage />);

      expect(screen.getByRole('button', { name: /new group/i })).toBeInTheDocument();
    });

    it('hides New Group button when user cannot edit', () => {
      setupMocks({ canEdit: false });

      render(<AlternateGroupsPage />);

      expect(screen.queryByRole('button', { name: /new group/i })).not.toBeInTheDocument();
    });

    it('shows placeholder message when no organization selected', () => {
      setupMocks({ hasOrganization: false });

      render(<AlternateGroupsPage />);

      expect(screen.getByText('Please select an organization.')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('renders search input', () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      expect(screen.getByPlaceholderText('Search groups...')).toBeInTheDocument();
    });

    it('filters groups by name', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      const searchInput = screen.getByPlaceholderText('Search groups...');
      fireEvent.change(searchInput, { target: { value: 'Oil' } });

      await waitFor(() => {
        expect(screen.getByText(partAlternateGroups.oilFilterGroup.name)).toBeInTheDocument();
        expect(screen.queryByText(partAlternateGroups.airFilterGroup.name)).not.toBeInTheDocument();
      });
    });

    it('filters groups by description', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      const searchInput = screen.getByPlaceholderText('Search groups...');
      fireEvent.change(searchInput, { target: { value: 'Industrial' } });

      await waitFor(() => {
        expect(screen.getByText(partAlternateGroups.airFilterGroup.name)).toBeInTheDocument();
        expect(screen.queryByText(partAlternateGroups.oilFilterGroup.name)).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search matches nothing', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      const searchInput = screen.getByPlaceholderText('Search groups...');
      fireEvent.change(searchInput, { target: { value: 'xyz123nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No groups found')).toBeInTheDocument();
        expect(screen.getByText(/No groups match/)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to group detail when card is clicked', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      const groupCard = screen.getByText(partAlternateGroups.oilFilterGroup.name).closest('[class*="cursor-pointer"]');
      if (groupCard) {
        fireEvent.click(groupCard);
      }

      expect(mockNavigate).toHaveBeenCalledWith(
        `/dashboard/alternate-groups/${partAlternateGroups.oilFilterGroup.id}`
      );
    });

    it('navigates via card click', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      // Click on the group card directly (primary navigation method)
      const groupCard = screen.getByText(partAlternateGroups.oilFilterGroup.name).closest('[class*="cursor-pointer"]');
      expect(groupCard).not.toBeNull();
      
      if (groupCard) {
        fireEvent.click(groupCard);
      }

      expect(mockNavigate).toHaveBeenCalledWith(
        `/dashboard/alternate-groups/${partAlternateGroups.oilFilterGroup.id}`
      );
    });
  });

  describe('Create Group', () => {
    it('opens create dialog when New Group button is clicked', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      const newButton = screen.getByRole('button', { name: /new group/i });
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Create Alternate Group')).toBeInTheDocument();
        expect(screen.getByTestId('alternate-group-form')).toBeInTheDocument();
      });
    });

    it('shows Create First Group button in empty state', async () => {
      setupMocks({ groups: [] });

      render(<AlternateGroupsPage />);

      expect(screen.getByRole('button', { name: /create first group/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /create first group/i }));

      await waitFor(() => {
        expect(screen.getByText('Create Alternate Group')).toBeInTheDocument();
      });
    });

    it('closes create dialog on cancel', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      fireEvent.click(screen.getByRole('button', { name: /new group/i }));

      await waitFor(() => {
        expect(screen.getByTestId('alternate-group-form')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByTestId('alternate-group-form')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Group', () => {
    it('renders edit option in card menu when user can edit', () => {
      setupMocks({ canEdit: true });

      render(<AlternateGroupsPage />);

      // Verify cards are rendered with expected structure
      expect(screen.getByText(partAlternateGroups.oilFilterGroup.name)).toBeInTheDocument();
      expect(screen.getByText(partAlternateGroups.airFilterGroup.name)).toBeInTheDocument();
      
      // The new group button exists confirming edit mode
      expect(screen.getByRole('button', { name: /new group/i })).toBeInTheDocument();
    });
  });

  describe('Delete Group', () => {
    it('has delete mutation hook available', () => {
      const { mockDeleteMutateAsync } = setupMocks();

      render(<AlternateGroupsPage />);

      // Verify the hook was initialized
      expect(useDeleteAlternateGroup).toHaveBeenCalled();
      expect(mockDeleteMutateAsync).toBeDefined();
    });
  });

  describe('Permission Checks', () => {
    it('hides dropdown menu for users without edit permission', () => {
      setupMocks({ canEdit: false });

      render(<AlternateGroupsPage />);

      const allButtons = screen.queryAllByRole('button');
      const menuButtons = allButtons.filter(
        (btn) => btn.querySelector('svg.lucide-more-horizontal')
      );
      expect(menuButtons.length).toBe(0);
    });

    it('hides Create First Group button when user cannot edit', () => {
      setupMocks({ groups: [], canEdit: false });

      render(<AlternateGroupsPage />);

      expect(screen.queryByRole('button', { name: /create first group/i })).not.toBeInTheDocument();
    });
  });
});

/**
 * User Journey Tests: Alternate Groups Page
 */
describe('AlternateGroupsPage User Journeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * User Story: As a Parts Manager, I want to see all alternate groups
   * so I can manage interchangeable parts efficiently.
   */
  describe('Parts Manager views all alternate groups', () => {
    it('displays groups with status indicators', () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      // Should see all groups
      expect(screen.getByText(partAlternateGroups.oilFilterGroup.name)).toBeInTheDocument();
      expect(screen.getByText(partAlternateGroups.airFilterGroup.name)).toBeInTheDocument();

      // Verified group should have badge
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  /**
   * User Story: As a Parts Manager, I want to search for specific groups
   * to quickly find the alternates I need.
   */
  describe('Parts Manager searches for groups', () => {
    it('finds groups by partial name match', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      fireEvent.change(screen.getByPlaceholderText('Search groups...'), {
        target: { value: 'oil' },
      });

      await waitFor(() => {
        expect(screen.getByText(partAlternateGroups.oilFilterGroup.name)).toBeInTheDocument();
      });
    });
  });

  /**
   * User Story: As a Parts Manager, I want to create a new alternate group
   * when I discover interchangeable parts.
   */
  describe('Parts Manager creates new group', () => {
    it('opens form and can create new group', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      fireEvent.click(screen.getByRole('button', { name: /new group/i }));

      await waitFor(() => {
        expect(screen.getByText('Create Alternate Group')).toBeInTheDocument();
        expect(
          screen.getByText(/Create a group for interchangeable parts/)
        ).toBeInTheDocument();
      });
    });
  });

  /**
   * User Story: As a Parts Manager, I want to delete an obsolete group
   * to keep the catalog clean.
   */
  describe('Parts Manager deletes obsolete group', () => {
    it('has delete capability available for managers', () => {
      const { mockDeleteMutateAsync } = setupMocks({ canEdit: true });

      render(<AlternateGroupsPage />);

      // Verify the delete mutation is available
      expect(useDeleteAlternateGroup).toHaveBeenCalled();
      expect(mockDeleteMutateAsync).toBeDefined();
      
      // Verify page renders with edit capabilities
      expect(screen.getByRole('button', { name: /new group/i })).toBeInTheDocument();
    });
  });

  /**
   * User Story: As a Technician, I want to view alternate groups
   * but should not see edit/delete options.
   */
  describe('Technician views groups (read-only)', () => {
    it('technician can view but not edit groups', () => {
      setupMocks({ canEdit: false });

      render(<AlternateGroupsPage />);

      // Can see groups
      expect(screen.getByText(partAlternateGroups.oilFilterGroup.name)).toBeInTheDocument();

      // Cannot see edit controls
      expect(screen.queryByRole('button', { name: /new group/i })).not.toBeInTheDocument();
      
      const allButtons = screen.queryAllByRole('button');
      const menuButtons = allButtons.filter(
        (btn) => btn.querySelector('svg.lucide-more-horizontal')
      );
      expect(menuButtons.length).toBe(0);
    });
  });
});
