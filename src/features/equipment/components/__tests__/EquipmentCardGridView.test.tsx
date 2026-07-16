import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EquipmentCardGridView } from '../EquipmentCardGridView';
import { getEquipmentCardDisplayModel } from '@/features/equipment/utils/getEquipmentCardDisplayModel';
import { getEquipmentCardPmReadout } from '@/features/equipment/utils/getEquipmentCardPmReadout';
import { testUserSettingsSydney } from '@/test/utils/TestProviders';

const mockEquipment = {
  id: 'eq-1',
  name: 'Forklift A1',
  manufacturer: 'Toyota',
  model: 'Model X',
  serial_number: 'SN12345',
  status: 'active',
  location: 'Warehouse A',
  last_maintenance: '2024-01-15',
  working_hours: 1500,
  team_name: 'Heavy Equipment Team',
};

describe('EquipmentCardGridView', () => {
  const display = getEquipmentCardDisplayModel(mockEquipment, testUserSettingsSydney);
  const pmReadout = getEquipmentCardPmReadout(undefined);

  it('does not render status badge or header PM dot', () => {
    render(
      <EquipmentCardGridView
        equipment={mockEquipment}
        display={display}
        pmReadout={pmReadout}
        onQRClick={vi.fn()}
        onQuickAction={vi.fn()}
      />,
    );

    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('PM')).not.toBeInTheDocument();
    expect(screen.getByText('PM status')).toBeInTheDocument();
  });

  it('renders working hours without a redundant hrs suffix', () => {
    render(
      <EquipmentCardGridView
        equipment={mockEquipment}
        display={display}
        pmReadout={pmReadout}
        onQRClick={vi.fn()}
        onQuickAction={vi.fn()}
      />,
    );

    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText(display.workingHoursDisplay)).toBeInTheDocument();
    expect(screen.queryByText('hrs')).not.toBeInTheDocument();
    expect(screen.queryByText('HRS')).not.toBeInTheDocument();
  });

  it('scales large working-hour values to stay inside the telemetry cell', () => {
    const largeHoursDisplay = getEquipmentCardDisplayModel(
      { ...mockEquipment, working_hours: 99999.99 },
      testUserSettingsSydney,
    );

    render(
      <EquipmentCardGridView
        equipment={{ ...mockEquipment, working_hours: 99999.99 }}
        display={largeHoursDisplay}
        pmReadout={pmReadout}
        onQRClick={vi.fn()}
        onQuickAction={vi.fn()}
      />,
    );

    const hoursValue = screen.getByText(largeHoursDisplay.workingHoursDisplay);
    expect(hoursValue).toHaveClass('truncate');
    expect(hoursValue).toHaveClass('text-lg');
  });

  it('opens the new work order form from the card action', async () => {
    const user = userEvent.setup();
    const onQuickAction = vi.fn();

    render(
      <EquipmentCardGridView
        equipment={mockEquipment}
        display={display}
        pmReadout={pmReadout}
        onQRClick={vi.fn()}
        onQuickAction={onQuickAction}
      />,
    );

    await user.click(screen.getByRole('button', { name: /new work order/i }));

    expect(onQuickAction).toHaveBeenCalledWith(
      expect.anything(),
      '/dashboard/equipment/eq-1?createWorkOrder=1',
    );
  });
});
