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

vi.mock('../WorkOrderMobileExportSection', () => ({
  WorkOrderMobileExportSection: () => (
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
    isManager: true,
    onViewFullDetails: vi.fn(),
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
  });

  it('lists View full details before Download exports', () => {
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText('More work order options')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    const viewIdx = buttons.findIndex((b) => b.textContent?.includes('View full details'));
    const pdfIdx = buttons.findIndex((b) => b.textContent?.includes('PDF'));
    expect(viewIdx).toBeGreaterThanOrEqual(0);
    expect(pdfIdx).toBeGreaterThan(viewIdx);
  });

  it('omits download exports for non-managers', () => {
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet {...baseProps} isManager={false} fileExportHandlers={undefined} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Download')).not.toBeInTheDocument();
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

  it('shows Admin section with delete requiring DELETE confirmation', async () => {
    render(
      <MemoryRouter>
        <MobileWorkOrderActionSheet {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit work order/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /delete work order/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/All uploaded images/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    const deletePermanently = screen.getByRole('button', { name: /delete permanently/i });
    expect(deletePermanently).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/type delete to confirm/i), 'DELETE');
    expect(deletePermanently).not.toBeDisabled();
  });
});
