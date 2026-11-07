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

  it('renders a single equipment trigger with no separate search button', () => {
    render(<WorkOrderEquipmentSelector {...defaultProps} />);

    expect(screen.getByRole('button', { name: /^select equipment$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /search equipment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('opens the picker dialog and selects equipment from the filtered list', async () => {
    const setValue = vi.fn();
    render(<WorkOrderEquipmentSelector {...defaultProps} setValue={setValue} />);

    fireEvent.click(screen.getByRole('button', { name: /^select equipment$/i }));

    expect(await screen.findByRole('dialog', { name: /choose equipment/i })).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search equipment\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Toyota' } });

    fireEvent.click(screen.getByRole('button', { name: /select toyota forklift/i }));

    expect(setValue).toHaveBeenCalledWith('equipmentId', 'eq-2');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /choose equipment/i })).not.toBeInTheDocument();
    });
  });

  it('offers "New equipment" inside the picker when creation is allowed', async () => {
    render(
      <WorkOrderEquipmentSelector
        {...defaultProps}
        canCreateEquipment
        canCreateEquipmentForTeam={() => true}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^select equipment$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /new equipment/i }));

    expect(await screen.findByTestId('quick-equipment-form')).toBeInTheDocument();
  });

  it('hides "New equipment" when creation is not allowed', async () => {
    render(<WorkOrderEquipmentSelector {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /^select equipment$/i }));
    await screen.findByRole('dialog', { name: /choose equipment/i });

    expect(screen.queryByRole('button', { name: /new equipment/i })).not.toBeInTheDocument();
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
