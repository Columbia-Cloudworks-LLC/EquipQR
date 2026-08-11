import React from 'react';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrderEquipmentSelector } from './WorkOrderEquipmentSelector';
import type { EquipmentSelectorItem } from '@/features/work-orders/types/workOrderEquipment';

vi.mock('@/features/equipment/hooks/useEquipmentWorkingHours', () => ({
  useEquipmentCurrentWorkingHours: vi.fn(() => ({ data: 500 })),
  useUpdateEquipmentWorkingHours: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/features/equipment/components/QuickEquipmentForm', () => ({
  QuickEquipmentForm: () => <div data-testid="quick-equipment-form">Quick form</div>,
}));

const mockEquipment: EquipmentSelectorItem[] = [
  {
    id: 'eq-1',
    name: 'CAT 320 Excavator',
    manufacturer: 'Caterpillar',
    model: '320',
    serial_number: 'SN-001',
    location: 'Yard A',
    team: { id: 'team-1', name: 'Field Crew' },
    working_hours: 1200,
  },
  {
    id: 'eq-2',
    name: 'Toyota Forklift',
    manufacturer: 'Toyota',
    model: '8FGU25',
    serial_number: 'TF-99',
    location: 'Warehouse B',
    team: { id: 'team-2', name: 'Warehouse' },
  },
];

const defaultProps = {
  values: { equipmentId: '' } as Parameters<typeof WorkOrderEquipmentSelector>[0]['values'],
  errors: {},
  setValue: vi.fn(),
  allEquipment: mockEquipment,
  isEditMode: false,
  isEquipmentPreSelected: false,
};

describe('WorkOrderEquipmentSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders select trigger without cmdk search input on open', async () => {
    render(<WorkOrderEquipmentSelector {...defaultProps} />);

    expect(screen.getByRole('combobox', { name: /select equipment/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/search equipment/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('combobox', { name: /select equipment/i }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search equipment/i)).not.toBeInTheDocument();
    });
  });

  it('calls setValue when a select option is chosen', async () => {
    const setValue = vi.fn();
    render(<WorkOrderEquipmentSelector {...defaultProps} setValue={setValue} />);

    fireEvent.click(screen.getByRole('combobox', { name: /select equipment/i }));

    const option = await screen.findByRole('option', { name: /CAT 320 Excavator/i });
    fireEvent.click(option);

    expect(setValue).toHaveBeenCalledWith('equipmentId', 'eq-1');
  });

  it('opens search dialog and selects equipment from filtered list', async () => {
    const setValue = vi.fn();
    render(<WorkOrderEquipmentSelector {...defaultProps} setValue={setValue} />);

    fireEvent.click(screen.getByRole('button', { name: /search equipment/i }));

    expect(await screen.findByRole('dialog', { name: /search equipment/i })).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search equipment\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Toyota' } });

    fireEvent.click(screen.getByRole('button', { name: /select toyota forklift/i }));

    expect(setValue).toHaveBeenCalledWith('equipmentId', 'eq-2');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /search equipment/i })).not.toBeInTheDocument();
    });
  });

  it('shows read-only view when equipment is pre-selected', () => {
    render(
      <WorkOrderEquipmentSelector
        {...defaultProps}
        isEquipmentPreSelected
        preSelectedEquipment={mockEquipment[0]}
      />,
    );

    expect(screen.getByText('CAT 320 Excavator')).toBeInTheDocument();
    expect(screen.getByText(/Selected/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
