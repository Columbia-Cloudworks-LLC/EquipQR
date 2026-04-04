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
  });

  it('hides the Google Doc export action when the Workspace grant is missing Docs scope', async () => {
    const user = userEvent.setup();

    render(<WorkOrderDetailsDesktopHeader {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /more actions/i }));

    expect(screen.queryByText('Internal Work Order Packet (Google Doc)')).not.toBeInTheDocument();
  });
});
