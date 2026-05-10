import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MobileWorkOrderActionSheet } from '../MobileWorkOrderActionSheet';

vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: () => ({ data: false }),
}));

vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: () => false,
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: () => ({ hasRole: (roles: string[]) => roles.includes('admin') }),
}));

vi.mock('@/features/work-orders/hooks/useDeleteWorkOrder', () => ({
  useDeleteWorkOrder: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderImageCount', () => ({
  useWorkOrderImageCount: () => ({ data: { count: 2 } }),
}));

vi.mock('../QuickBooksExportButton', () => ({
  QuickBooksExportButton: () => <div>QB export</div>,
}));

describe('MobileWorkOrderActionSheet', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    workOrderId: 'wo-1',
    workOrderStatus: 'in_progress' as const,
    equipmentTeamId: 'team-1',
    isManager: true,
    onViewFullDetails: vi.fn(),
    canEdit: true,
    onEdit: vi.fn(),
    onDownloadPDF: vi.fn(),
    onDownloadWorksheet: vi.fn(),
    isGeneratingWorksheet: false,
    onExportExcel: vi.fn(),
    isExportingExcel: false,
    onExportGoogleDoc: vi.fn(),
    isExportingGoogleDoc: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists View full details before Office tools', () => {
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText('More work order options')).toBeInTheDocument();
    expect(screen.getByText('Office tools')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    const viewIdx = buttons.findIndex((b) => b.textContent?.includes('View full details'));
    const pdfIdx = buttons.findIndex((b) => b.textContent?.includes('Service Report PDF'));
    expect(viewIdx).toBeGreaterThanOrEqual(0);
    expect(pdfIdx).toBeGreaterThan(viewIdx);
  });

  it('shows Admin section with edit and delete', async () => {
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit work order/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /delete work order/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/All uploaded images/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
