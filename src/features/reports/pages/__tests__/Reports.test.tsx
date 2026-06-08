import React from 'react';
import { render, screen, within } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Reports from '@/features/reports/pages/Reports';
import { organizations } from '@/test/fixtures/entities';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/features/reports/hooks/useReportExport', () => ({
  useReportRecordCount: vi.fn(),
  useReportExportDialog: vi.fn(),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderExcelExport', () => ({
  useWorkOrderExcelExport: vi.fn(),
  useWorkOrderExcelCount: vi.fn(),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceConnectionStatus', () => ({
  useGoogleWorkspaceConnectionStatus: vi.fn(),
}));

vi.mock('@/features/reports/components/ReportExportDialog', () => ({
  ReportExportDialog: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderExcelExportDialog', () => ({
  WorkOrderExcelExportDialog: () => null,
}));

import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useReportRecordCount, useReportExportDialog } from '@/features/reports/hooks/useReportExport';
import {
  useWorkOrderExcelExport,
  useWorkOrderExcelCount,
} from '@/features/work-orders/hooks/useWorkOrderExcelExport';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';

const defaultCountQuery = {
  data: 42,
  isLoading: false,
};

const setupMocks = (options: {
  hasOrganization?: boolean;
  canExport?: boolean;
  recordCount?: number;
  isLoadingCount?: boolean;
  isGoogleConnected?: boolean;
} = {}) => {
  const {
    hasOrganization = true,
    canExport = true,
    recordCount = 42,
    isLoadingCount = false,
    isGoogleConnected = false,
  } = options;

  vi.mocked(useOrganization).mockReturnValue({
    currentOrganization: hasOrganization
      ? { id: organizations.acme.id, name: organizations.acme.name }
      : null,
  } as ReturnType<typeof useOrganization>);

  vi.mocked(usePermissions).mockReturnValue({
    hasRole: vi.fn((roles: string[]) => {
      if (!canExport) return false;
      return roles.some((role) => role === 'owner' || role === 'admin');
    }),
  } as unknown as ReturnType<typeof usePermissions>);

  vi.mocked(useReportRecordCount).mockReturnValue({
    ...defaultCountQuery,
    data: recordCount,
    isLoading: isLoadingCount,
  } as ReturnType<typeof useReportRecordCount>);

  vi.mocked(useWorkOrderExcelCount).mockReturnValue({
    ...defaultCountQuery,
    data: recordCount,
    isLoading: isLoadingCount,
  } as ReturnType<typeof useWorkOrderExcelCount>);

  vi.mocked(useReportExportDialog).mockReturnValue({
    handleExport: vi.fn(),
  });

  vi.mocked(useWorkOrderExcelExport).mockReturnValue({
    bulkExport: vi.fn(),
    isBulkExporting: false,
    bulkExportError: null,
    exportToSheetsAsync: vi.fn(),
    isExportingToSheets: false,
  } as unknown as ReturnType<typeof useWorkOrderExcelExport>);

  vi.mocked(useGoogleWorkspaceConnectionStatus).mockReturnValue({
    isConnected: isGoogleConnected,
    isLoading: false,
  } as ReturnType<typeof useGoogleWorkspaceConnectionStatus>);
};

describe('Reports page (Fleet Export Console)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the export console shell with status strip and grouped reports', () => {
    render(<Reports />);

    expect(screen.getByRole('heading', { name: /fleet export console/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/export console status/i)).toBeInTheDocument();
    expect(screen.getByText(organizations.acme.name)).toBeInTheDocument();
    expect(screen.getByText(/primary export/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fleet Assets' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inventory & Parts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Scan Evidence' })).toBeInTheDocument();
  });

  it('features the Internal Work Order Packet with operation code and worksheets', () => {
    render(<Reports />);

    expect(screen.getAllByText('Internal Work Order Packet').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EXP-02').length).toBeGreaterThan(0);
    expect(screen.getByText('Worksheets included')).toBeInTheDocument();
    expect(screen.getByText('Labor Detail')).toBeInTheDocument();
    expect(screen.getAllByText('6 WORKSHEETS').length).toBeGreaterThan(0);
  });

  it('shows record-aware status badges when data is available', () => {
    render(<Reports />);

    expect(screen.getAllByText('42 READY').length).toBeGreaterThan(0);
  });

  it('renders renamed report titles and preview metadata', () => {
    render(<Reports />);

    expect(screen.getAllByText('Fleet Asset Register').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Parts Inventory Snapshot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('QR Scan Evidence Log').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alternate Parts Cross-Reference').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EXP-01').length).toBeGreaterThan(0);
  });

  it('shows direct quick and customize actions for CSV reports on desktop layout', () => {
    render(<Reports />);

    const quickButtons = screen.getAllByRole('button', { name: /^quick$/i });
    const customizeButtons = screen.getAllByRole('button', { name: /^customize$/i });

    expect(quickButtons.length).toBeGreaterThan(0);
    expect(customizeButtons.length).toBeGreaterThan(0);
  });

  it('disables export actions when record count is zero', () => {
    setupMocks({ recordCount: 0 });
    render(<Reports />);

    expect(screen.getAllByText('NO DATA').length).toBeGreaterThan(0);

    const configureButtons = screen.getAllByRole('button', { name: /configure export/i });
    expect(configureButtons[0]).toBeDisabled();

    const quickButtons = screen.getAllByRole('button', { name: /^quick$/i });
    quickButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('shows no-organization state', () => {
    setupMocks({ hasOrganization: false });
    render(<Reports />);

    expect(screen.getByText('No Organization Selected')).toBeInTheDocument();
    expect(screen.queryByText('Fleet Asset Register')).not.toBeInTheDocument();
  });

  it('shows access-restricted state for non-admin users', () => {
    setupMocks({ canExport: false });
    render(<Reports />);

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText('AUTH-01')).toBeInTheDocument();
    expect(screen.queryByText('Fleet Asset Register')).not.toBeInTheDocument();
  });

  it('shows Google Workspace connection status in the status strip', () => {
    setupMocks({ isGoogleConnected: true });
    render(<Reports />);

    const statusStrip = screen.getByLabelText(/export console status/i);
    expect(within(statusStrip).getByText('Connected')).toBeInTheDocument();
  });

  it('renders the export protocol panel trigger', () => {
    render(<Reports />);

    expect(screen.getByText('Export Protocol')).toBeInTheDocument();
  });
});
