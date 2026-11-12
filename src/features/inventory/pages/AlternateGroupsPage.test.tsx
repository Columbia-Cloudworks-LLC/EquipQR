/**
 * AlternateGroupsPage Component Tests
 *
 * Tests for the page that lists and manages alternate part groups.
 * Covers rendering, CRUD operations, search, and permission checks.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AlternateGroupsPage from './AlternateGroupsPage';
import { organizations, partAlternateGroups } from '@vitest-harness/fixtures/entities';

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

vi.mock('@/features/inventory/hooks/useInventoryPartsManagerAccess', () => ({
  useInventoryPartsManagerAccess: vi.fn(),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('@/features/inventory/components/AlternateGroupForm', () => ({
  AlternateGroupForm: ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => (
    <div data-testid="alternate-group-form">
      <button onClick={onSuccess}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('@/features/inventory/components/AlternateGroupCreateWizard', () => ({
  AlternateGroupCreateWizard: ({ onSuccess, onCancel }: { onSuccess: (groupId: string) => void; onCancel: () => void }) => (
    <div data-testid="alternate-group-create-wizard">
      <button onClick={() => onSuccess('new-group-id')}>Create Group</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

import { useOrganization } from '@/contexts/OrganizationContext';
import { createMockSessionOrganization } from '@vitest-harness/mocks/testTypes';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useAlternateGroups,
  useDeleteAlternateGroup,
} from '@/features/inventory/hooks/useAlternateGroups';
import { useInventoryPartsManagerAccess } from '@/features/inventory/hooks/useInventoryPartsManagerAccess';

// Mock data
const mockGroups = Object.values(partAlternateGroups);
const oilGroup = partAlternateGroups.oilFilterGroup;

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

  vi.mocked(useInventoryPartsManagerAccess).mockReturnValue({
    currentOrganization: hasOrganization
      ? createMockSessionOrganization({ id: organizations.acme.id, name: organizations.acme.name })
      : null,
    canEdit,
  });

  vi.mocked(usePermissions).mockReturnValue({
    canCreateEquipment: () => canEdit,
    canEditEquipment: () => canEdit,
    canDeleteEquipment: () => canEdit,
    canViewTeam: () => true,
    canEditTeam: () => canEdit,
    canManageTeamMembers: () => canEdit,
    canManageOrganization: () => canEdit,
    canManagePartsManagers: () => canEdit,
    canManageInventory: () => canEdit,
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

function renderEditableAlternateGroupsPage(
  options?: Parameters<typeof setupMocks>[0],
) {
  setupMocks({ canEdit: true, ...options });
  render(<AlternateGroupsPage />);
}

async function openCardMenu(groupName = oilGroup.name) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: `More options for ${groupName}` }));
  return user;
}

async function openDeleteConfirmation() {
  const user = await openCardMenu();
  await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
  const dialog = await screen.findByRole('alertdialog');
  return { user, dialog };
}

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

      const skeletons = document.querySelectorAll('[class*="animate-shimmer"], .bg-muted.rounded-md');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows empty state when no groups exist', () => {
      setupMocks({ groups: [] });

      render(<AlternateGroupsPage />);

      expect(screen.getByText('No alternate groups yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Group interchangeable or compatible parts/)
      ).toBeInTheDocument();
    });

    it('displays list of groups as cards', () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      mockGroups.forEach((group) => {
        expect(screen.getByText(group.name)).toBeInTheDocument();
      });
    });

    it('paginates card results instead of rendering every group at once', () => {
      const manyGroups = Array.from({ length: 15 }, (_, index) => ({
        ...partAlternateGroups.oilFilterGroup,
        id: `group-${index + 1}`,
        name: `Alternate Group ${String(index + 1).padStart(2, '0')}`,
        member_summaries: [],
        member_details: [],
      }));

      setupMocks({ groups: manyGroups });

      render(<AlternateGroupsPage />);

      const cards = screen.getAllByTestId(/^alternate-group-card-/);
      expect(cards).toHaveLength(12);
      expect(screen.getByText('Alternate Group 01')).toBeInTheDocument();
      expect(screen.getByText('Alternate Group 12')).toBeInTheDocument();
      expect(screen.queryByTestId('alternate-group-card-group-13')).not.toBeInTheDocument();
      expect(screen.getByTestId('alternate-groups-pagination-footer')).toBeInTheDocument();
      expect(screen.getByText(/Showing 1 to 12 of 15 groups/)).toBeInTheDocument();
    });

    it('uses separate pagination defaults when switching between card and table views', () => {
      const groups = Array.from({ length: 2 }, (_, groupIndex) => ({
        ...partAlternateGroups.oilFilterGroup,
        id: `group-${groupIndex + 1}`,
        name: `Alternate Group ${String(groupIndex + 1).padStart(2, '0')}`,
        member_details: Array.from({ length: 20 }, (_, memberIndex) => ({
          id: `member-${groupIndex + 1}-${memberIndex + 1}`,
          is_primary: memberIndex === 0,
          member_type: 'inventory' as const,
          inventory_item_id: `inv-${groupIndex + 1}-${memberIndex + 1}`,
          item_name: `Part ${groupIndex + 1}-${String(memberIndex + 1).padStart(2, '0')}`,
          item_sku: `SKU-${groupIndex + 1}-${memberIndex + 1}`,
          quantity_on_hand: 5,
          low_stock_threshold: 2,
          default_unit_cost: 10,
          location: 'Bay 1',
          identifier_type: null,
          identifier_value: null,
          identifier_manufacturer: null,
        })),
      }));

      setupMocks({ groups });

      render(<AlternateGroupsPage />);

      expect(screen.getByText(/Showing 1 to 2 of 2 groups/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: 'Table view' }));

      expect(screen.getByText(/Showing 1 to 25 of 40 parts/)).toBeInTheDocument();
      expect(screen.getByText('Part 2-05')).toBeInTheDocument();
      expect(screen.queryByText('Part 2-06')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: 'Card view' }));

      expect(screen.getByText(/Showing 1 to 2 of 2 groups/)).toBeInTheDocument();
    });

    it('shows part names instead of description when a group has members', () => {
      setupMocks({
        groups: [
          {
            ...partAlternateGroups.oilFilterGroup,
            member_count: 2,
            member_summaries: [
              { id: 'member-1', name: 'Oil Filter OEM', sku: 'OIL-100' },
              { id: 'member-2', name: 'Oil Filter Aftermarket', sku: 'OIL-200' },
            ],
          },
        ],
      });

      render(<AlternateGroupsPage />);

      expect(screen.getByText('Oil Filter OEM')).toBeInTheDocument();
      expect(screen.getByText('OIL-100')).toBeInTheDocument();
      expect(
        screen.queryByText(partAlternateGroups.oilFilterGroup.description!),
      ).not.toBeInTheDocument();
    });

    it('shows verified status dot for verified groups', () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      expect(screen.getAllByRole('img', { name: 'Verified' }).length).toBeGreaterThan(0);
    });

    it('renders table view with flattened part rows on desktop', () => {
      setupMocks({
        groups: [
          {
            ...partAlternateGroups.oilFilterGroup,
            member_details: [
              {
                id: 'member-1',
                is_primary: true,
                member_type: 'inventory',
                inventory_item_id: 'inv-oil-filter',
                item_name: 'Oil Filter OEM',
                item_sku: 'OIL-100',
                quantity_on_hand: 8,
                low_stock_threshold: 2,
                default_unit_cost: 15,
                location: 'Bay 1',
                identifier_type: null,
                identifier_value: null,
                identifier_manufacturer: null,
              },
            ],
          },
        ],
      });

      render(<AlternateGroupsPage />);

      fireEvent.click(screen.getByRole('radio', { name: 'Table view' }));

      expect(screen.getByRole('button', { name: 'Sort by Alternate Group' })).toBeInTheDocument();
      expect(screen.getByText('Oil Filter OEM')).toBeInTheDocument();
      expect(screen.getByText('OIL-100')).toBeInTheDocument();
    });

    it('hides card sort control in table view and shows it again in card view', () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      expect(
        screen.getByRole('button', { name: 'Sort alternate groups' }),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: 'Table view' }));

      expect(
        screen.queryByRole('button', { name: 'Sort alternate groups' }),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: 'Card view' }));

      expect(
        screen.getByRole('button', { name: 'Sort alternate groups' }),
      ).toBeInTheDocument();
    });

    it('shows New Alternate Part Group button when user can edit', () => {
      setupMocks({ canEdit: true });

      render(<AlternateGroupsPage />);

      expect(screen.getByRole('button', { name: /new alternate part group/i })).toBeInTheDocument();
    });

    it('hides New Alternate Part Group button when user cannot edit', () => {
      setupMocks({ canEdit: false });

      render(<AlternateGroupsPage />);

      expect(screen.queryByRole('button', { name: /new alternate part group/i })).not.toBeInTheDocument();
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

      expect(screen.getByPlaceholderText('Search by name or description...')).toBeInTheDocument();
    });

    it('filters groups by name', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      const searchInput = screen.getByPlaceholderText('Search by name or description...');
      fireEvent.change(searchInput, { target: { value: 'Oil' } });

      await waitFor(() => {
        expect(screen.getByText(partAlternateGroups.oilFilterGroup.name)).toBeInTheDocument();
        expect(screen.queryByText(partAlternateGroups.airFilterGroup.name)).not.toBeInTheDocument();
      });
    });

    it('filters groups by description', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      const searchInput = screen.getByPlaceholderText('Search by name or description...');
      fireEvent.change(searchInput, { target: { value: 'Industrial' } });

      await waitFor(() => {
        expect(screen.getByText(partAlternateGroups.airFilterGroup.name)).toBeInTheDocument();
        expect(screen.queryByText(partAlternateGroups.oilFilterGroup.name)).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search matches nothing', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      const searchInput = screen.getByPlaceholderText('Search by name or description...');
      fireEvent.change(searchInput, { target: { value: 'xyz123nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No groups found')).toBeInTheDocument();
        expect(screen.getByText(/No groups match/)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
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
    it('opens wizard when New Alternate Part Group button is clicked', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      const newButton = screen.getByRole('button', { name: /new alternate part group/i });
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByTestId('alternate-group-create-wizard')).toBeInTheDocument();
      });
    });

    it('shows New Alternate Part Group button in empty state', async () => {
      setupMocks({ groups: [] });

      render(<AlternateGroupsPage />);

      // Both the PageHeader action and the empty-state card have this button
      const newGroupButtons = screen.getAllByRole('button', { name: /new alternate part group/i });
      expect(newGroupButtons.length).toBeGreaterThan(0);

      // Click the empty-state button (last one in DOM)
      fireEvent.click(newGroupButtons[newGroupButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByTestId('alternate-group-create-wizard')).toBeInTheDocument();
      });
    });

    it('opens wizard and navigates on successful create', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      fireEvent.click(screen.getByRole('button', { name: /new alternate part group/i }));

      await waitFor(() => {
        expect(screen.getByTestId('alternate-group-create-wizard')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/alternate-groups/new-group-id');
      });
    });

    it('closes wizard on cancel', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      fireEvent.click(screen.getByRole('button', { name: /new alternate part group/i }));

      await waitFor(() => {
        expect(screen.getByTestId('alternate-group-create-wizard')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByTestId('alternate-group-create-wizard')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Group', () => {
    it('opens delete confirmation dialog when delete is clicked from dropdown', async () => {
      renderEditableAlternateGroupsPage();

      const { dialog } = await openDeleteConfirmation();

      expect(within(dialog).getByText(`Are you sure you want to delete "${oilGroup.name}"?`, { exact: false })).toBeInTheDocument();
    });

    it('calls delete mutation when confirmed', async () => {
      const { mockDeleteMutateAsync } = setupMocks({ canEdit: true });
      render(<AlternateGroupsPage />);

      const { user, dialog } = await openDeleteConfirmation();
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
          organizationId: organizations.acme.id,
          groupId: oilGroup.id,
        });
      });
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('closes confirmation dialog when cancelled', async () => {
      const { mockDeleteMutateAsync } = setupMocks({ canEdit: true });
      render(<AlternateGroupsPage />);

      const { user, dialog } = await openDeleteConfirmation();
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Dropdown Menu Actions', () => {
    it('opens dropdown menu when more button is clicked', async () => {
      renderEditableAlternateGroupsPage();

      await openCardMenu();

      expect(await screen.findByRole('menuitem', { name: 'View Details' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
    });

    it('navigates to detail page when View Details is clicked', async () => {
      renderEditableAlternateGroupsPage();

      const user = await openCardMenu();
      await user.click(await screen.findByRole('menuitem', { name: 'View Details' }));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(`/dashboard/alternate-groups/${oilGroup.id}`);
    });

    it('opens edit dialog when Edit is clicked', async () => {
      renderEditableAlternateGroupsPage();

      const user = await openCardMenu();
      await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Edit Alternate Group')).toBeInTheDocument();
      expect(within(dialog).getByTestId('alternate-group-form')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Permission Checks', () => {
    it('hides dropdown menu for users without edit permission', () => {
      setupMocks({ canEdit: false });

      render(<AlternateGroupsPage />);

      expect(screen.getByText(oilGroup.name)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /more options for/i })).not.toBeInTheDocument();
    });

    it('hides New Alternate Part Group button when user cannot edit in empty state', () => {
      setupMocks({ groups: [], canEdit: false });

      render(<AlternateGroupsPage />);

      expect(screen.queryByRole('button', { name: /new alternate part group/i })).not.toBeInTheDocument();
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
   * User Story: As a Parts Manager, I want to search for specific groups
   * to quickly find the alternates I need.
   */
  describe('Parts Manager searches for groups', () => {
    it('finds groups by partial name match', async () => {
      setupMocks();

      render(<AlternateGroupsPage />);

      fireEvent.change(screen.getByPlaceholderText('Search by name or description...'), {
        target: { value: 'oil' },
      });

      await waitFor(() => {
        expect(screen.getByText(partAlternateGroups.oilFilterGroup.name)).toBeInTheDocument();
      });
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
      expect(screen.queryByRole('button', { name: /new alternate part group/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /more options for/i })).not.toBeInTheDocument();
    });
  });
});
