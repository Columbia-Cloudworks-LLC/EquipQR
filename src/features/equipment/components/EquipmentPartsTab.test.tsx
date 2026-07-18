import React from 'react';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentPartsTab from './EquipmentPartsTab';
import * as useInventoryModule from '@/features/inventory/hooks/useInventory';
import type { PartialInventoryItem } from '@/features/inventory/types/inventory';

/**
 * Wiring + empty/loading smoke tests. Search/sort/stock filter logic is covered by
 * `usePartsFiltering.test.tsx` — do not re-drive every Radix Select here.
 */
vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useCompatibleInventoryItems: vi.fn(),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

const createMockPart = (overrides: Partial<PartialInventoryItem> = {}): PartialInventoryItem => ({
  id: 'part-1',
  organization_id: 'org-1',
  name: 'Test Part',
  description: null,
  sku: 'SKU-001',
  external_id: null,
  quantity_on_hand: 10,
  low_stock_threshold: 5,
  image_url: null,
  location: 'Warehouse A',
  default_unit_cost: 100,
  isLowStock: false,
  hasAlternates: false,
  ...overrides,
});

const mockParts: PartialInventoryItem[] = [
  createMockPart({
    id: 'part-1',
    name: 'Alpha Filter',
    sku: 'SKU-ALPHA',
    quantity_on_hand: 15,
    location: 'Shelf A',
  }),
  createMockPart({
    id: 'part-2',
    name: 'Beta Gasket',
    sku: 'SKU-BETA',
    quantity_on_hand: 3,
    low_stock_threshold: 5,
    location: 'Shelf B',
    hasAlternates: true,
  }),
  createMockPart({
    id: 'part-3',
    name: 'Gamma Seal',
    sku: 'SKU-GAMMA',
    quantity_on_hand: 0,
    location: 'Shelf C',
  }),
  createMockPart({
    id: 'part-4',
    name: 'Delta Bearing',
    sku: 'SKU-DELTA',
    quantity_on_hand: 25,
    location: 'Shelf A',
    hasAlternates: true,
  }),
];

describe('EquipmentPartsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useInventoryModule.useCompatibleInventoryItems).mockReturnValue({
      data: mockParts,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useInventoryModule.useCompatibleInventoryItems>);
  });

  it('renders header, search, and part cards with stock badges', () => {
    render(<EquipmentPartsTab equipmentId="eq-1" organizationId="org-1" />);

    expect(screen.getByText('Compatible Parts')).toBeInTheDocument();
    expect(screen.getByText('4 parts compatible with this equipment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search parts...')).toBeInTheDocument();
    expect(screen.getByText('Alpha Filter')).toBeInTheDocument();
    expect(screen.getByText('Beta Gasket')).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getAllByText('Alternates').length).toBeGreaterThanOrEqual(2);
  });

  it('shows loading skeletons when isLoading', () => {
    vi.mocked(useInventoryModule.useCompatibleInventoryItems).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useInventoryModule.useCompatibleInventoryItems>);

    const { container } = render(
      <EquipmentPartsTab equipmentId="eq-1" organizationId="org-1" />,
    );
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it('shows empty state when no compatible parts exist', () => {
    vi.mocked(useInventoryModule.useCompatibleInventoryItems).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useInventoryModule.useCompatibleInventoryItems>);

    render(<EquipmentPartsTab equipmentId="eq-1" organizationId="org-1" />);
    expect(screen.getByText('No compatible parts')).toBeInTheDocument();
  });

  it('wires search to filtered empty state and clear filters', async () => {
    render(<EquipmentPartsTab equipmentId="eq-1" organizationId="org-1" />);

    fireEvent.change(screen.getByPlaceholderText('Search parts...'), {
      target: { value: 'nonexistent' },
    });

    await waitFor(() => {
      expect(screen.getByText('No parts match your filters')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() => {
      expect(screen.getByText('4 parts compatible with this equipment')).toBeInTheDocument();
      expect(screen.getByText('Alpha Filter')).toBeInTheDocument();
    });
  });

  it('renders mobile filter button on mobile', async () => {
    const { useIsMobile } = await import('@/hooks/use-mobile');
    vi.mocked(useIsMobile).mockReturnValue(true);

    render(<EquipmentPartsTab equipmentId="eq-1" organizationId="org-1" />);
    expect(screen.getByRole('button', { name: /open filters/i })).toBeInTheDocument();
  });
});
