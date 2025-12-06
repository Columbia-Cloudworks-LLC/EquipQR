import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Equipment from '@/pages/Equipment';
import { render } from '@/test/utils/test-utils';


vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ 
    canCreateEquipment: () => true,
    hasRole: vi.fn(() => true)
  }),
}));

// Mock filtering hook to control states
vi.mock('@/components/equipment/hooks/useEquipmentFiltering', () => ({
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
vi.mock('@/components/equipment/EquipmentHeader', () => ({
  default: ({ organizationName, onAddEquipment }: { organizationName?: string; onAddEquipment?: () => void }) => (
    <div>
      <div>Header - {organizationName}</div>
      <button onClick={onAddEquipment}>Add Equipment</button>
    </div>
  ),
}));

vi.mock('@/components/equipment/EquipmentFilters', () => ({
  EquipmentFilters: () => <div>Filters</div>,
}));

vi.mock('@/components/equipment/EquipmentSortHeader', () => ({
  default: ({ resultCount, totalCount }: { resultCount?: number; totalCount?: number }) => (
    <div>SortHeader resultCount={resultCount} totalCount={totalCount}</div>
  ),
}));

vi.mock('@/components/equipment/EquipmentGrid', () => ({
  default: ({ onShowQRCode }: { onShowQRCode?: (id: string) => void }) => (
    <div>
      <div>Grid</div>
      <button onClick={() => onShowQRCode?.('1')}>Show QR</button>
    </div>
  ),
}));

vi.mock('@/components/equipment/EquipmentLoadingState', () => ({
  default: () => <div>Loading Equipment...</div>,
}));

vi.mock('@/components/equipment/EquipmentForm', () => ({
  default: ({ open }: { open?: boolean }) => (
    <div data-testid="equipment-form">{open ? 'Form Open' : 'Form Closed'}</div>
  ),
}));

vi.mock('@/components/equipment/QRCodeDisplay', () => ({
  default: ({ open, equipmentName }: { open?: boolean; equipmentName?: string }) => (
    <div data-testid="qr-modal">{open ? `QR for ${equipmentName}` : 'Closed'}</div>
  ),
}));

import { useEquipmentFiltering } from '@/hooks/useEquipmentFiltering';
import { useOrganization } from '@/contexts/OrganizationContext';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({ currentOrganization: { id: 'org-1', name: 'Org 1' } })),
}));

describe('Equipment page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders counts and opens form and QR modal', () => {
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

    // The mock shows the correct values now
    expect(screen.getByText('SortHeader resultCount=2 totalCount=3')).toBeInTheDocument();

    // Open form
    fireEvent.click(screen.getByText('Add Equipment'));
    expect(screen.getByTestId('equipment-form')).toHaveTextContent('Form Open');

    // Open QR modal
    expect(screen.getByTestId('qr-modal')).toHaveTextContent('Closed');
    fireEvent.click(screen.getByText('Show QR'));
    expect(screen.getByTestId('qr-modal')).toHaveTextContent('QR for Excavator');
  });
});
