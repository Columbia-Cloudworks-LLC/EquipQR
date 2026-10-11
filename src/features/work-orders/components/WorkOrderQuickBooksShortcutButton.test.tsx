import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkOrderQuickBooksShortcutButton } from './WorkOrderQuickBooksShortcutButton';

const mockUseExportState = vi.fn();

vi.mock('@/features/work-orders/hooks/useWorkOrderQuickBooksExportState', () => ({
  useWorkOrderQuickBooksExportState: (...args: unknown[]) => mockUseExportState(...args),
}));

const readyState = {
  featureEnabled: true,
  canExport: true,
  accessLoading: false,
  isExporting: false,
  isLoading: false,
  hasLinkedInvoice: false,
  tooltipMessage: 'Export work order as a draft invoice in QuickBooks',
  showSetupState: false,
  setupDisabled: false,
  updateLabel: 'Update Invoice',
};

describe('WorkOrderQuickBooksShortcutButton', () => {
  const props = {
    workOrderId: 'wo-1',
    teamId: 'team-1',
    workOrderStatus: 'completed' as const,
    onReviewInvoice: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExportState.mockReturnValue(readyState);
  });

  it('opens invoice review from Export to QuickBooks when no invoice is linked', async () => {
    const user = userEvent.setup();
    render(<WorkOrderQuickBooksShortcutButton {...props} />);

    await user.click(screen.getByRole('button', { name: 'Export to QuickBooks' }));

    expect(props.onReviewInvoice).toHaveBeenCalledTimes(1);
  });

  it('labels a linked invoice as an update without claiming draft status', () => {
    mockUseExportState.mockReturnValue({ ...readyState, hasLinkedInvoice: true, updateLabel: 'Update Invoice #1042' });

    render(<WorkOrderQuickBooksShortcutButton {...props} />);

    expect(screen.getByRole('button', { name: 'Update Invoice #1042' })).toBeEnabled();
    expect(screen.queryByText(/draft invoice #/i)).not.toBeInTheDocument();
  });

  it('stays hidden until QuickBooks setup is complete', () => {
    mockUseExportState.mockReturnValue({ ...readyState, showSetupState: true, setupDisabled: true });

    const { container } = render(<WorkOrderQuickBooksShortcutButton {...props} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('stays hidden for users without QuickBooks access and for open work orders', () => {
    mockUseExportState.mockReturnValue({ ...readyState, canExport: false });
    const { container, rerender } = render(<WorkOrderQuickBooksShortcutButton {...props} />);
    expect(container).toBeEmptyDOMElement();

    mockUseExportState.mockReturnValue(readyState);
    rerender(<WorkOrderQuickBooksShortcutButton {...props} workOrderStatus="in_progress" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('disables the button while an export is running', () => {
    mockUseExportState.mockReturnValue({ ...readyState, isExporting: true, isLoading: true });

    render(<WorkOrderQuickBooksShortcutButton {...props} />);

    expect(screen.getByRole('button', { name: 'Export to QuickBooks' })).toBeDisabled();
  });
});
