import React from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { WorkOrderDetailsMobileHeader } from './WorkOrderDetailsMobileHeader';

describe('WorkOrderDetailsMobileHeader', () => {
  const baseProps = {
    workOrder: { title: 'Hydraulic Pump Inspection' },
    onOpenActionSheet: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and back link', () => {
    render(<WorkOrderDetailsMobileHeader {...baseProps} />);

    expect(screen.getByRole('heading', { name: /hydraulic pump inspection/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /work orders/i })).toHaveAttribute('href', '/dashboard/work-orders');
  });

  it('invokes overflow handler from actions button', async () => {
    const user = userEvent.setup();
    render(<WorkOrderDetailsMobileHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /open actions and settings/i }));

    expect(baseProps.onOpenActionSheet).toHaveBeenCalledTimes(1);
  });

  it('uses Export label when showExports is true', async () => {
    const user = userEvent.setup();
    render(<WorkOrderDetailsMobileHeader {...baseProps} showExports />);

    await user.click(screen.getByRole('button', { name: /^export$/i }));

    expect(baseProps.onOpenActionSheet).toHaveBeenCalledTimes(1);
  });

  it('does not render a full edit work order button', () => {
    render(<WorkOrderDetailsMobileHeader {...baseProps} />);

    expect(screen.queryByRole('button', { name: /edit work order/i })).not.toBeInTheDocument();
  });
});
