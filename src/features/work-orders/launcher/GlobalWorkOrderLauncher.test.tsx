import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import GlobalWorkOrderLauncher from './GlobalWorkOrderLauncher';
import { openNewWorkOrder } from './newWorkOrderLauncher';

const mocks = vi.hoisted(() => ({
  isMobile: vi.fn(() => false),
  canCreate: vi.fn(() => true),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mocks.isMobile(),
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: () => ({
    workOrders: { getPermissions: () => ({ canCreate: mocks.canCreate() }) },
  }),
}));

vi.mock('@/features/work-orders/components/WorkOrderForm', () => ({
  default: ({
    equipmentId,
    prefillTitle,
    onClose,
  }: {
    equipmentId?: string;
    prefillTitle?: string;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="Create Work Order">
      <span data-testid="launcher-equipment">{equipmentId ?? 'none'}</span>
      <span data-testid="launcher-title">{prefillTitle ?? ''}</span>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

describe('GlobalWorkOrderLauncher', () => {
  beforeEach(() => {
    mocks.isMobile.mockReturnValue(false);
    mocks.canCreate.mockReturnValue(true);
  });

  it('opens the New Work Order dialog when C is pressed outside a field', async () => {
    render(<GlobalWorkOrderLauncher />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'c' });

    expect(await screen.findByRole('dialog', { name: 'Create Work Order' })).toBeInTheDocument();
    expect(screen.getByTestId('launcher-equipment')).toHaveTextContent('none');
  });

  it('does not hijack C while the user is typing', () => {
    render(
      <>
        <input aria-label="Search" />
        <GlobalWorkOrderLauncher />
      </>,
    );

    fireEvent.keyDown(screen.getByLabelText('Search'), { key: 'c' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves Ctrl+C alone', () => {
    render(<GlobalWorkOrderLauncher />);

    fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has no keyboard shortcut on mobile', () => {
    mocks.isMobile.mockReturnValue(true);
    render(<GlobalWorkOrderLauncher />);

    fireEvent.keyDown(document.body, { key: 'c' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens pre-populated with equipment when a row or card asks for it', async () => {
    render(<GlobalWorkOrderLauncher />);

    act(() => openNewWorkOrder({ equipmentId: 'eq-42', title: 'Repair: Horn' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('launcher-equipment')).toHaveTextContent('eq-42');
    expect(screen.getByTestId('launcher-title')).toHaveTextContent('Repair: Horn');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays closed for users who cannot create work orders', () => {
    mocks.canCreate.mockReturnValue(false);
    render(<GlobalWorkOrderLauncher />);

    fireEvent.keyDown(document.body, { key: 'c' });
    act(() => openNewWorkOrder({ equipmentId: 'eq-42' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
