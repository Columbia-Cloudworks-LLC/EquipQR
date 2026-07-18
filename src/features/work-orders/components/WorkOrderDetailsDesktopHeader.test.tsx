import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { WorkOrderDetailsDesktopHeader } from './WorkOrderDetailsDesktopHeader';

const mockUseWorkOrderPDF = vi.fn();
const mockUseWorkOrderExcelExport = vi.fn();
const mockUseGoogleWorkspaceConnectionStatus = vi.fn();
const mockUseGoogleWorkspaceExportDestination = vi.fn();
const mockUseUnifiedPermissions = vi.fn();
const mockUseDeleteWorkOrder = vi.fn();
const mockUseWorkOrderImageCount = vi.fn();
const mockUseQuickBooksAccess = vi.fn();
const mockIsQuickBooksEnabled = vi.fn();

vi.mock('./WorkOrderQuickBooksExportSubmenu', () => ({
  WorkOrderQuickBooksExportSubmenu: () => <span>QuickBooks</span>,
}));

vi.mock('./WorkOrderGoogleDriveExportSubmenu', () => ({
  WorkOrderGoogleDriveExportSubmenu: () => <span>Google Drive</span>,
}));

vi.mock('./WorkOrderPDFExportDialog', () => ({
  WorkOrderPDFExportDialog: () => null,
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderPDFData', () => ({
  useWorkOrderPDF: (...args: unknown[]) => mockUseWorkOrderPDF(...args),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderExcelExport', () => ({
  useWorkOrderExcelExport: (...args: unknown[]) => mockUseWorkOrderExcelExport(...args),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceConnectionStatus', () => ({
  useGoogleWorkspaceConnectionStatus: (...args: unknown[]) => mockUseGoogleWorkspaceConnectionStatus(...args),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceExportDestination', () => ({
  useGoogleWorkspaceExportDestination: (...args: unknown[]) => mockUseGoogleWorkspaceExportDestination(...args),
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: (...args: unknown[]) => mockUseUnifiedPermissions(...args),
}));

vi.mock('@/features/work-orders/hooks/useDeleteWorkOrder', () => ({
  useDeleteWorkOrder: (...args: unknown[]) => mockUseDeleteWorkOrder(...args),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderImageCount', () => ({
  useWorkOrderImageCount: (...args: unknown[]) => mockUseWorkOrderImageCount(...args),
}));

vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: (...args: unknown[]) => mockUseQuickBooksAccess(...args),
}));

vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: (...args: unknown[]) => mockIsQuickBooksEnabled(...args),
}));

describe('WorkOrderDetailsDesktopHeader', () => {
  const baseProps = {
    workOrder: {
      id: 'wo-1',
      title: 'Replace hydraulic line',
      description: 'Repair the leaking boom hose',
      status: 'completed' as const,
      priority: 'high' as const,
      created_date: '2026-04-01T00:00:00Z',
      equipment_id: 'eq-1',
      organization_id: 'org-1',
    },
    formMode: 'manager',
    permissionLevels: {
      isManager: true,
      isTechnician: false,
      isRequestor: false,
      canEdit: true,
      canDelete: true,
      canAssign: true,
      canChangeStatus: true,
      canAddNotes: true,
      canAddImages: true,
      exportAudience: 'admin' as const,
    },
    equipmentTeamId: 'team-1',
    equipment: {
      id: 'eq-1',
      name: 'Excavator A',
      status: 'active' as const,
    },
    organizationName: 'CW Rentals',
    organizationId: 'org-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseWorkOrderPDF.mockReturnValue({
      downloadPDF: vi.fn(),
      isGenerating: false,
      saveToDrive: vi.fn(),
      isSavingToDrive: false,
    });

    mockUseWorkOrderExcelExport.mockReturnValue({
      exportSingle: vi.fn(),
      isExportingSingle: false,
      exportSingleToDocs: vi.fn(),
      isExportingSingleToDocs: false,
      exportSingleToSheets: vi.fn(),
      isExportingSingleToSheets: false,
      exportSingleCsv: vi.fn(),
      isExportingSingleCsv: false,
      exportSingleDocx: vi.fn(),
      isExportingSingleDocx: false,
    });

    mockUseGoogleWorkspaceConnectionStatus.mockReturnValue({
      isConnected: true,
      connectionStatus: {
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.readonly',
        ].join(' '),
      },
    });

    mockUseGoogleWorkspaceExportDestination.mockReturnValue({
      destination: {
        parent_id: 'folder-1',
        display_name: 'Ops Exports',
      },
    });

    mockUseUnifiedPermissions.mockReturnValue({
      hasRole: vi.fn(() => true),
    });

    mockUseDeleteWorkOrder.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    mockUseWorkOrderImageCount.mockReturnValue({
      data: { count: 0 },
    });

    mockUseQuickBooksAccess.mockReturnValue({ data: false });
    mockIsQuickBooksEnabled.mockReturnValue(false);
  });

  it('renders title and status badge in the PageHeader meta area', () => {
    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    expect(screen.getByRole('heading', { name: baseProps.workOrder.title })).toBeInTheDocument();
    expect(screen.getAllByText('Completed')).toHaveLength(2);
    expect(screen.getAllByText(/High\s+Priority/)).toHaveLength(2);
  });

  it('renders breadcrumbs with truncated work order ID', () => {
    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    expect(screen.getByText('Work Orders')).toBeInTheDocument();
    expect(screen.getByText('WO-WO-1')).toBeInTheDocument();
  });

  it('shows grouped export submenus for managers without delete in export menu', async () => {
    const user = userEvent.setup();
    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.queryByText('Delete Work Order')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete work order', hidden: true })).toBeInTheDocument();
  });

  it('hides admin exports when exportAudience is none', () => {
    mockUseUnifiedPermissions.mockReturnValue({
      hasRole: vi.fn(() => false),
    });

    render(
      <WorkOrderDetailsDesktopHeader
        {...baseProps}
        permissionLevels={{
          ...baseProps.permissionLevels,
          isManager: false,
          canDelete: false,
          exportAudience: 'none',
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('shows customer-safe Service Report PDF export for scoped viewers', async () => {
    const user = userEvent.setup();
    render(
      <WorkOrderDetailsDesktopHeader
        {...baseProps}
        permissionLevels={{
          ...baseProps.permissionLevels,
          isManager: false,
          exportAudience: 'customer-safe',
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(screen.getByText('Service Report PDF')).toBeInTheDocument();
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
    expect(screen.queryByText('Google Drive')).not.toBeInTheDocument();
  });

  it('hides Google Drive submenu when Workspace is not connected', async () => {
    const user = userEvent.setup();
    mockUseGoogleWorkspaceConnectionStatus.mockReturnValue({
      isConnected: false,
      connectionStatus: { scopes: '' },
    });

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.queryByText('Google Drive')).not.toBeInTheDocument();
  });

  it('shows QuickBooks submenu when QuickBooks is enabled and accessible', async () => {
    const user = userEvent.setup();
    mockIsQuickBooksEnabled.mockReturnValue(true);
    mockUseQuickBooksAccess.mockReturnValue({ data: true });

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(screen.getByText('QuickBooks')).toBeInTheDocument();
  });

  it('hides QuickBooks submenu when QuickBooks is disabled', async () => {
    const user = userEvent.setup();
    mockIsQuickBooksEnabled.mockReturnValue(false);
    mockUseQuickBooksAccess.mockReturnValue({ data: true });

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(screen.queryByText('QuickBooks')).not.toBeInTheDocument();
  });

  it('hides Delete when user is not owner or admin', () => {
    mockUseUnifiedPermissions.mockReturnValue({
      hasRole: vi.fn(() => false),
    });

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    expect(screen.queryByRole('button', { name: 'Delete work order' })).not.toBeInTheDocument();
  });

  it('hides the entire actions menu when no sections are visible', () => {
    mockUseUnifiedPermissions.mockReturnValue({
      hasRole: vi.fn(() => false),
    });

    render(
      <WorkOrderDetailsDesktopHeader
        {...baseProps}
        permissionLevels={{
          ...baseProps.permissionLevels,
          isManager: false,
          exportAudience: 'none',
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('aligns wrapper with page shell horizontal padding', () => {
    const { container } = render(<WorkOrderDetailsDesktopHeader {...baseProps} />);
    const wrapper = container.querySelector('.lg\\:block');
    expect(wrapper?.className).toContain('px-4');
    expect(wrapper?.className).toContain('lg:px-6');
  });
});
