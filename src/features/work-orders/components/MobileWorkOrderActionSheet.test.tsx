import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckCircle, Plus } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { MobileWorkOrderActionSheet } from './MobileWorkOrderActionSheet';

const mockHasRole = vi.fn((roles: string[]) => roles.includes('admin'));

vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: () => ({ data: false }),
}));

vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: () => false,
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: () => ({ hasRole: (...args: unknown[]) => mockHasRole(...args as [string[]]) }),
}));

vi.mock('@/features/work-orders/hooks/useDeleteWorkOrder', () => ({
  useDeleteWorkOrder: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderImageCount', () => ({
  useWorkOrderImageCount: () => ({ data: { count: 2 } }),
}));

vi.mock('./QuickBooksExportButton', () => ({
  QuickBooksExportButton: () => <div>QB export</div>,
}));

vi.mock('./WorkOrderMobileExportSection', () => ({
  WorkOrderMobileExportSection: ({
    exportAudience,
  }: {
    exportAudience?: 'admin' | 'customer-safe' | 'none';
  }) =>
    exportAudience === 'customer-safe' ? (
      <div>
        <p>Download</p>
        <button type="button">PDF</button>
      </div>
    ) : (
      <div>
        <p>Download</p>
        <button type="button">DOCX</button>
        <button type="button">PDF</button>
        <button type="button">XLSX</button>
        <button type="button">CSV</button>
        <button type="button">Field Worksheet</button>
      </div>
    ),
}));

describe('MobileWorkOrderActionSheet', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    workOrderId: 'wo-1',
    workOrderStatus: 'in_progress' as const,
    equipmentTeamId: 'team-1',
    organizationId: 'org-1',
    exportAudience: 'admin' as const,
    onOpenPdfDialog: vi.fn(),
    onOpenDrivePdfDialog: vi.fn(),
    isGeneratingPdf: false,
    onDownloadWorksheet: vi.fn(),
    isGeneratingWorksheet: false,
    fileExportHandlers: {
      onDownloadXlsx: vi.fn(),
      isExportingXlsx: false,
      onDownloadCsv: vi.fn(),
      isExportingCsv: false,
      onDownloadDocx: vi.fn(),
      isExportingDocx: false,
      docxDisabled: false,
      onDriveDocs: vi.fn(),
      isExportingToDocs: false,
      onDriveSheets: vi.fn(),
      isExportingToSheets: false,
      isExportBusy: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole.mockImplementation((roles: string[]) => roles.includes('admin'));
  });

  it('lists quick actions when provided', () => {
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet
          {...baseProps}
          quickActions={[
            { id: 'complete', label: 'Complete work order', icon: CheckCircle, tone: 'success', onSelect: vi.fn() },
            { id: 'add-note-or-photo', label: 'Add note or photo', icon: Plus, tone: 'capture', onSelect: vi.fn() },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /complete work order/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add note or photo/i })).toBeInTheDocument();
  });

  it('does not show a redundant View full details navigation action', () => {
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Work order actions')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view full details/i })).not.toBeInTheDocument();
  });

  it('omits download exports when exportAudience is none', () => {
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet {...baseProps} exportAudience="none" fileExportHandlers={undefined} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Download')).not.toBeInTheDocument();
  });

  it('shows customer-safe PDF export for scoped viewers', () => {
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet {...baseProps} exportAudience="customer-safe" fileExportHandlers={undefined} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'XLSX' })).not.toBeInTheDocument();
  });

  it('shows desktop-parity download formats for managers', () => {
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet {...baseProps} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'DOCX' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'XLSX' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /field worksheet/i })).toBeInTheDocument();
  });

  it('keeps delete as the last low-emphasis mobile action and still requires DELETE confirmation', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet
          {...baseProps}
          quickActions={[
            { id: 'complete', label: 'Complete work order', icon: CheckCircle, tone: 'success', onSelect: vi.fn() },
            { id: 'add-note-or-photo', label: 'Add note or photo', icon: Plus, tone: 'capture', onSelect: vi.fn() },
          ]}
        />
      </MemoryRouter>,
    );

    const deleteButton = screen.getByRole('button', { name: /delete work order/i });

    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(deleteButton.parentElement?.lastElementChild).toBe(deleteButton);
    expect(deleteButton.previousElementSibling).toHaveAttribute('aria-orientation', 'horizontal');
    expect(deleteButton.className).toContain('border');
    expect(deleteButton.className).toContain('bg-background');
    expect(deleteButton.className).not.toContain('bg-destructive');
    expect(deleteButton.className).not.toContain('text-destructive-foreground');

    await user.click(deleteButton);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/All uploaded images/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    const deletePermanently = screen.getByRole('button', { name: /delete permanently/i });
    expect(deletePermanently).toBeDisabled();
    await user.type(screen.getByLabelText(/type delete to confirm/i), 'DELETE');
    expect(deletePermanently).not.toBeDisabled();
  });

  it.each([
    ['technicians', 'customer-safe' as const],
    ['viewers', 'customer-safe' as const],
  ])('does not render delete for %s', (_roleLabel, exportAudience) => {
    mockHasRole.mockReturnValue(false);

    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet
          {...baseProps}
          exportAudience={exportAudience}
          quickActions={[
            { id: 'complete', label: 'Complete work order', icon: CheckCircle, tone: 'success', onSelect: vi.fn() },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /delete work order/i })).not.toBeInTheDocument();
    expect(screen.getByText('Work order actions')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });
});
