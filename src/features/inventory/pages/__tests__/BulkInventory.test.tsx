import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/features/inventory/hooks/usePartsManagers', () => ({
  useIsPartsManager: vi.fn(() => ({ data: false, isLoading: false })),
}));

vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useInventoryItems: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('@/features/inventory/hooks/useBulkEditInventory', () => ({
  useBulkEditInventory: vi.fn(() => ({
    dirtyRows: new Map(),
    selectedRowIds: new Set(),
    dirtyCount: 0,
    selectedCount: 0,
    isPending: false,
    setCellValue: vi.fn(),
    setCellValueOnRows: vi.fn(),
    clearDirty: vi.fn(),
    toggleSelected: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    commit: vi.fn(),
  })),
}));

vi.mock('@/features/inventory/components/InventoryBulkGrid', () => ({
  InventoryBulkGrid: () => <div data-testid="inventory-bulk-grid" />,
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
  })),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

import { useIsMobile } from '@/hooks/use-mobile';
import * as usePermissionsModule from '@/hooks/usePermissions';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  };
});

import BulkInventory from '../BulkInventory';

describe('BulkInventory page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePermissionsModule.usePermissions).mockReturnValue({
      canManageInventory: () => true,
    } as unknown as ReturnType<typeof usePermissionsModule.usePermissions>);
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  it('renders the grid and commit toolbar when user can manage inventory', async () => {
    render(<BulkInventory />);

    expect(await screen.findByTestId('inventory-bulk-grid')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /bulk edit commit toolbar/i })).toBeInTheDocument();
  });

  it('redirects mobile users to /dashboard/inventory', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<BulkInventory />);

    const nav = screen.getByTestId('navigate');
    expect(nav).toHaveAttribute('data-to', '/dashboard/inventory');
  });

  it('shows permission-denied message when user cannot manage inventory', () => {
    vi.mocked(usePermissionsModule.usePermissions).mockReturnValue({
      canManageInventory: () => false,
    } as unknown as ReturnType<typeof usePermissionsModule.usePermissions>);

    render(<BulkInventory />);

    expect(screen.getByText(/bulk inventory editing is restricted/i)).toBeInTheDocument();
    expect(screen.queryByTestId('inventory-bulk-grid')).not.toBeInTheDocument();
  });

  it('renders page title', async () => {
    render(<BulkInventory />);
    expect(await screen.findByText('Bulk Edit Inventory')).toBeInTheDocument();
  });
});
