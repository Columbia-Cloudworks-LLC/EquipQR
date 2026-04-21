import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import Equipment from '@/features/equipment/pages/Equipment';
import { render } from '@/test/utils/test-utils';


vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ 
    canCreateEquipment: () => true,
    hasRole: vi.fn(() => true)
  }),
}));

vi.mock('@/hooks/useSelectedTeam', () => ({
  useSelectedTeam: () => ({
    selectedTeamId: null,
    selectedTeam: null,
    setSelectedTeamId: vi.fn(),
  }),
}));

vi.mock('@/features/teams/hooks/useTeamManagement', () => ({
  useTeams: vi.fn(() => ({ teams: [], managedTeams: [], isLoading: false, error: null, data: [] })),
  useTeam: vi.fn(() => ({ data: null, isLoading: false })),
  useTeamMutations: vi.fn(() => ({ createTeamWithCreator: { mutateAsync: vi.fn() }, deleteTeam: { mutateAsync: vi.fn() } })),
  useTeamMembers: vi.fn(() => ({ availableUsers: { data: [] }, addMember: { mutateAsync: vi.fn() }, removeMember: { mutateAsync: vi.fn() }, updateRole: { mutateAsync: vi.fn() } })),
  useTeamManagerCheck: vi.fn(() => ({ data: false, isLoading: false })),
}));

// Mock filtering hook to control states
vi.mock('@/features/equipment/hooks/useEquipmentFiltering', () => ({
  useEquipmentFiltering: vi.fn(() => ({
    filters: { search: '', status: 'all' },
    sortConfig: { field: 'name', direction: 'asc' },
    showAdvancedFilters: false,
    filteredAndSortedEquipment: [],
    paginatedEquipment: [],
    filterOptions: { manufacturers: [], locations: [], teams: [] },
    isLoading: false,
    hasActiveFilters: false,
    equipment: [],
    currentPage: 1,
    pageSize: 10,
    totalPages: 0,
    totalFilteredCount: 0,
    updateFilter: vi.fn(),
    updateSort: vi.fn(),
    clearFilters: vi.fn(),
    applyQuickFilter: vi.fn(),
    setShowAdvancedFilters: vi.fn(),
    setCurrentPage: vi.fn(),
    setPageSize: vi.fn(),
  })),
}));

// Stub child components to simplify rendering assertions
vi.mock('@/features/equipment/components/EquipmentHeader', () => ({
  default: ({ organizationName, onAddEquipment }: { organizationName?: string; onAddEquipment?: () => void }) => (
    <div>
      <div>Header - {organizationName}</div>
      <button onClick={onAddEquipment}>Add Equipment</button>
    </div>
  ),
}));

vi.mock('@/features/equipment/components/EquipmentFilters', () => ({
  EquipmentFilters: () => <div>Filters</div>,
}));

vi.mock('@/features/equipment/components/EquipmentSortHeader', () => ({
  default: ({ resultCount, totalCount }: { resultCount?: number; totalCount?: number }) => (
    <div>SortHeader resultCount={resultCount} totalCount={totalCount}</div>
  ),
}));

vi.mock('@/features/equipment/components/EquipmentGrid', () => ({
  default: ({ onShowQRCode, viewMode }: { onShowQRCode?: (id: string) => void; viewMode?: string }) => (
    <div>
      <div>Grid</div>
      <div data-testid="grid-view-mode">{viewMode ?? 'undefined'}</div>
      <button onClick={() => onShowQRCode?.('1')}>Show QR</button>
    </div>
  ),
}));

vi.mock('@/features/equipment/components/EquipmentLoadingState', () => ({
  default: () => <div>Loading Equipment...</div>,
}));

vi.mock('@/features/equipment/components/EquipmentForm', () => ({
  default: ({ open }: { open?: boolean }) => (
    <div data-testid="equipment-form">{open ? 'Form Open' : 'Form Closed'}</div>
  ),
}));

vi.mock('@/features/equipment/components/QRCodeDisplay', () => ({
  default: ({ open, equipmentName }: { open?: boolean; equipmentName?: string }) => (
    <div data-testid="qr-modal">{open ? `QR for ${equipmentName}` : 'Closed'}</div>
  ),
}));

import { useEquipmentFiltering } from '@/features/equipment/hooks/useEquipmentFiltering';
import { useOrganization } from '@/contexts/OrganizationContext';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({ currentOrganization: { id: 'org-1', name: 'Org 1' } })),
}));

describe('Equipment page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset persisted view mode between tests so the localStorage hydration
    // assertions below start from a known state.
    window.localStorage.removeItem('equipqr:equipment-view-mode');
  });

  it('shows message when no organization is selected', () => {
    (useOrganization as ReturnType<typeof vi.fn>).mockReturnValue({ currentOrganization: null });

    // Ensure hook returns something minimal even when org null
    (useEquipmentFiltering as ReturnType<typeof vi.fn>).mockReturnValue({
      filters: { search: '', status: 'all' },
      sortConfig: { field: 'name', direction: 'asc' },
      showAdvancedFilters: false,
      filteredAndSortedEquipment: [],
      paginatedEquipment: [],
      filterOptions: { manufacturers: [], locations: [], teams: [] },
      isLoading: false,
      hasActiveFilters: false,
      equipment: [],
      currentPage: 1,
      pageSize: 10,
      totalPages: 0,
      totalFilteredCount: 0,
      updateFilter: vi.fn(),
      updateSort: vi.fn(),
      clearFilters: vi.fn(),
      applyQuickFilter: vi.fn(),
      setShowAdvancedFilters: vi.fn(),
      setCurrentPage: vi.fn(),
      setPageSize: vi.fn(),
    });

    render(<Equipment />);
    expect(
      screen.getByText('Please select an organization to view equipment.')
    ).toBeInTheDocument();
  });

  it('renders loading state', () => {
    (useOrganization as ReturnType<typeof vi.fn>).mockReturnValue({ currentOrganization: { id: 'org-1', name: 'Org 1' } });
    (useEquipmentFiltering as ReturnType<typeof vi.fn>).mockReturnValue({
      filters: { search: '', status: 'all' },
      sortConfig: { field: 'name', direction: 'asc' },
      showAdvancedFilters: false,
      filteredAndSortedEquipment: [],
      paginatedEquipment: [],
      filterOptions: { manufacturers: [], locations: [], teams: [] },
      isLoading: true,
      hasActiveFilters: false,
      equipment: [],
      currentPage: 1,
      pageSize: 10,
      totalPages: 0,
      totalFilteredCount: 0,
      updateFilter: vi.fn(),
      updateSort: vi.fn(),
      clearFilters: vi.fn(),
      applyQuickFilter: vi.fn(),
      setShowAdvancedFilters: vi.fn(),
      setCurrentPage: vi.fn(),
      setPageSize: vi.fn(),
    });

    render(<Equipment />);
    expect(screen.getByText('Loading Equipment...')).toBeInTheDocument();
  });

  it('renders counts and opens form and QR modal', async () => {
    (useOrganization as ReturnType<typeof vi.fn>).mockReturnValue({ currentOrganization: { id: 'org-1', name: 'Org 1' } });

    (useEquipmentFiltering as ReturnType<typeof vi.fn>).mockReturnValue({
      filters: { search: '', status: 'all' },
      sortConfig: { field: 'name', direction: 'asc' },
      showAdvancedFilters: false,
      filteredAndSortedEquipment: [{ id: '1' }, { id: '2' }],
      paginatedEquipment: [{ id: '1' }, { id: '2' }],
      filterOptions: { manufacturers: [], locations: [], teams: [] },
      isLoading: false,
      hasActiveFilters: false,
      equipment: [{ id: '1', name: 'Excavator' }, { id: '2', name: 'Bulldozer' }, { id: '3', name: 'Forklift' }],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalFilteredCount: 2,
      updateFilter: vi.fn(),
      updateSort: vi.fn(),
      clearFilters: vi.fn(),
      applyQuickFilter: vi.fn(),
      setShowAdvancedFilters: vi.fn(),
      setCurrentPage: vi.fn(),
      setPageSize: vi.fn(),
    });

    render(<Equipment />);

    // Sort header is mobile-only; pagination reflects filtered vs total equipment counts
    expect(screen.getByText(/showing 1 to 2 of 2 results/i)).toBeInTheDocument();

    // Open form: dropdown trigger first, then "Add Single Equipment" menu item.
    // The desktop "Add Equipment" button is now a DropdownMenu split-action (#627),
    // so opening the single-item form takes two clicks. userEvent (rather than
    // fireEvent) is required here because Radix's DropdownMenuTrigger reads
    // pointerdown + click together, which fireEvent.click alone does not satisfy
    // in jsdom.
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Add Equipment/i }));
    await user.click(await screen.findByRole('menuitem', { name: /Add Single Equipment/i }));
    expect(screen.getByTestId('equipment-form')).toHaveTextContent('Form Open');

    // Open QR modal
    expect(screen.getByTestId('qr-modal')).toHaveTextContent('Closed');
    fireEvent.click(screen.getByText('Show QR'));
    expect(screen.getByTestId('qr-modal')).toHaveTextContent('QR for Excavator');
  });

  describe('viewMode localStorage hydration', () => {
    const setupHookForView = () => {
      (useOrganization as ReturnType<typeof vi.fn>).mockReturnValue({
        currentOrganization: { id: 'org-1', name: 'Org 1' },
      });
      (useEquipmentFiltering as ReturnType<typeof vi.fn>).mockReturnValue({
        filters: { search: '', status: 'all' },
        sortConfig: { field: 'name', direction: 'asc' },
        showAdvancedFilters: false,
        filteredAndSortedEquipment: [],
        paginatedEquipment: [],
        filterOptions: { manufacturers: [], locations: [], teams: [] },
        isLoading: false,
        hasActiveFilters: false,
        equipment: [],
        currentPage: 1,
        pageSize: 10,
        totalPages: 0,
        totalFilteredCount: 0,
        updateFilter: vi.fn(),
        updateSort: vi.fn(),
        clearFilters: vi.fn(),
        applyQuickFilter: vi.fn(),
        setShowAdvancedFilters: vi.fn(),
        setCurrentPage: vi.fn(),
        setPageSize: vi.fn(),
      });
    };

    it('defaults to "grid" when nothing is persisted', () => {
      setupHookForView();
      render(<Equipment />);
      expect(screen.getByTestId('grid-view-mode')).toHaveTextContent('grid');
    });

    it('hydrates "list" from localStorage', () => {
      window.localStorage.setItem('equipqr:equipment-view-mode', 'list');
      setupHookForView();
      render(<Equipment />);
      expect(screen.getByTestId('grid-view-mode')).toHaveTextContent('list');
    });

    it('hydrates "table" from localStorage', () => {
      window.localStorage.setItem('equipqr:equipment-view-mode', 'table');
      setupHookForView();
      render(<Equipment />);
      expect(screen.getByTestId('grid-view-mode')).toHaveTextContent('table');
    });

    it('falls back to "grid" for an unknown persisted value', () => {
      window.localStorage.setItem('equipqr:equipment-view-mode', 'garbage');
      setupHookForView();
      render(<Equipment />);
      expect(screen.getByTestId('grid-view-mode')).toHaveTextContent('grid');
    });
  });
});
