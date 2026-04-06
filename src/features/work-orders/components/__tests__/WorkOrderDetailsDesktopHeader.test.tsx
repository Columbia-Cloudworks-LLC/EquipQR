import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils/test-utils';
import { WorkOrderDetailsDesktopHeader } from '../WorkOrderDetailsDesktopHeader';

const mockUseWorkOrderPDF = vi.fn();
const mockUseWorkOrderExcelExport = vi.fn();
const mockUseGoogleWorkspaceConnectionStatus = vi.fn();
const mockUseGoogleWorkspaceExportDestination = vi.fn();
const mockUseUnifiedPermissions = vi.fn();
const mockUseDeleteWorkOrder = vi.fn();
const mockUseWorkOrderImageCount = vi.fn();
const mockUseLatestExportArtifact = vi.fn();
const mockUseQuickBooksAccess = vi.fn();
const mockIsQuickBooksEnabled = vi.fn();

vi.mock('../QuickBooksExportButton', () => ({
  QuickBooksExportButton: () => null,
}));

vi.mock('../WorkOrderPDFExportDialog', () => ({
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

vi.mock('@/features/work-orders/hooks/useLatestExportArtifact', () => ({
  useLatestExportArtifact: (...args: unknown[]) => mockUseLatestExportArtifact(...args),
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
      isRequestor: false,
      canEdit: true,
      canDelete: true,
      canAssign: true,
      canChangeStatus: true,
      canAddNotes: true,
      canAddImages: true,
    },
    canEdit: true,
    onEditClick: vi.fn(),
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
      downloadFieldWorksheet: vi.fn(),
      isGeneratingWorksheet: false,
    });

    mockUseWorkOrderExcelExport.mockReturnValue({
      exportSingle: vi.fn(),
      isExportingSingle: false,
      exportSingleToDocs: vi.fn(),
      isExportingSingleToDocs: false,
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

    mockUseLatestExportArtifact.mockReturnValue({
      data: null,
    });

    mockUseQuickBooksAccess.mockReturnValue({ data: false });
    mockIsQuickBooksEnabled.mockReturnValue(false);
  });

  it('renders title and status badge in the PageHeader meta area', () => {
    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    expect(screen.getByRole('heading', { name: baseProps.workOrder.title })).toBeInTheDocument();
    // PageHeader renders meta in both desktop and mobile slots
    expect(screen.getAllByText('Completed')).toHaveLength(2);
    expect(screen.getAllByText(/High\s+Priority/)).toHaveLength(2);
  });

  it('renders breadcrumbs with truncated work order ID', () => {
    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    expect(screen.getByText('Work Orders')).toBeInTheDocument();
    expect(screen.getByText('WO-WO-1')).toBeInTheDocument();
  });

  it('shows Exports section label for managers', async () => {
    const user = userEvent.setup();
    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.getByText('Exports')).toBeInTheDocument();
    expect(screen.getByText('Service Report PDF')).toBeInTheDocument();
    expect(screen.getByText('Internal Work Order Packet')).toBeInTheDocument();
  });

  it('hides exports when user is not a manager', async () => {
    render(
      <WorkOrderDetailsDesktopHeader
        {...baseProps}
        permissionLevels={{ ...baseProps.permissionLevels, isManager: false }}
      />,
    );

    // Actions menu still renders (canDelete is true via hasRole mock)
    const actionsBtn = screen.queryByRole('button', { name: 'Actions' });
    if (actionsBtn) {
      const user = userEvent.setup();
      await user.click(actionsBtn);
      expect(screen.queryByText('Exports')).not.toBeInTheDocument();
      expect(screen.queryByText('Service Report PDF')).not.toBeInTheDocument();
    }
  });

  it('hides the Google Doc export action when the Workspace grant is missing Docs scope', async () => {
    const user = userEvent.setup();

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.queryByText('Internal Work Order Packet (Google Doc)')).not.toBeInTheDocument();
  });

  it('shows "Open Last Google Doc" when an artifact exists', async () => {
    const user = userEvent.setup();

    mockUseLatestExportArtifact.mockReturnValue({
      data: {
        id: 'art-1',
        provider_file_id: 'doc-abc',
        web_view_link: 'https://docs.google.com/document/d/doc-abc/edit',
        last_exported_at: '2026-04-04T12:00:00Z',
        export_channel: 'google_docs',
        artifact_kind: 'internal_packet',
      },
    });

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.getByText('Open Last Google Doc')).toBeInTheDocument();
  });

  it('hides "Open Last Google Doc" when no artifact exists', async () => {
    const user = userEvent.setup();

    mockUseLatestExportArtifact.mockReturnValue({ data: null });

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.queryByText('Open Last Google Doc')).not.toBeInTheDocument();
  });

  it('shows Integrations section when QuickBooks is enabled and accessible', async () => {
    const user = userEvent.setup();
    mockIsQuickBooksEnabled.mockReturnValue(true);
    mockUseQuickBooksAccess.mockReturnValue({ data: true });

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.getByText('Integrations')).toBeInTheDocument();
  });

  it('hides Integrations section when QuickBooks is disabled', async () => {
    const user = userEvent.setup();
    mockIsQuickBooksEnabled.mockReturnValue(false);
    mockUseQuickBooksAccess.mockReturnValue({ data: true });

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.queryByText('Integrations')).not.toBeInTheDocument();
  });

  it('hides Delete when user is not owner or admin', async () => {
    const user = userEvent.setup();
    mockUseUnifiedPermissions.mockReturnValue({
      hasRole: vi.fn(() => false),
    });

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.queryByText('Delete Work Order')).not.toBeInTheDocument();
  });

  it('hides the entire actions menu when no sections are visible', () => {
    mockUseUnifiedPermissions.mockReturnValue({
      hasRole: vi.fn(() => false),
    });

    render(
      <WorkOrderDetailsDesktopHeader
        {...baseProps}
        permissionLevels={{ ...baseProps.permissionLevels, isManager: false }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('aligns wrapper with page shell horizontal padding', () => {
    const { container } = render(<WorkOrderDetailsDesktopHeader {...baseProps} />);
    const wrapper = container.querySelector('.lg\\:block');
    expect(wrapper?.className).toContain('px-4');
    expect(wrapper?.className).toContain('lg:px-6');
  });
});
