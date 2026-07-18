import React from 'react';
import { render, screen, within } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Reports from '@/features/reports/pages/Reports';
import { organizations } from '@vitest-harness/fixtures/entities';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/features/teams/hooks/useTeamMembership', () => ({
  useTeamMembership: vi.fn(),
}));

vi.mock('@/features/reports/hooks/useScopedExportTeamIds', () => ({
  useScopedExportTeamIds: vi.fn(),
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

import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { useScopedExportTeamIds } from '@/features/reports/hooks/useScopedExportTeamIds';
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
  isScopedViewer?: boolean;
  recordCount?: number;
  isLoadingCount?: boolean;
  isGoogleConnected?: boolean;
} = {}) => {
  const {
    hasOrganization = true,
    canExport = true,
    isScopedViewer = false,
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
      if (isScopedViewer) return false;
      if (!canExport) return false;
      return roles.some((role) => role === 'owner' || role === 'admin');
    }),
  } as unknown as ReturnType<typeof usePermissions>);

  vi.mocked(useTeamMembership).mockReturnValue({
    teamMemberships: isScopedViewer
      ? [{
          team_id: 'team-1',
          team_name: 'Customer Service',
          role: 'viewer' as const,
          joined_date: '2024-01-01',
        }]
      : [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    hasTeamRole: vi.fn(),
    hasTeamAccess: vi.fn(),
    canManageTeam: vi.fn(),
    getUserTeamIds: vi.fn(() => (isScopedViewer ? ['team-1'] : [])),
  } as unknown as ReturnType<typeof useTeamMembership>);

  vi.mocked(useScopedExportTeamIds).mockReturnValue({
    teamIds: isScopedViewer ? ['team-1'] : [],
    isLoading: false,
  });

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

  it('features the Internal Work Order Packet with inline worksheet selection', () => {
    render(<Reports />);

    expect(screen.getAllByText('Internal Work Order Packet').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Worksheets to export').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /export packet/i }).length).toBeGreaterThan(0);
  });

  it('shows record counts in module stats when data is available', () => {
    render(<Reports />);

    expect(screen.getAllByText('42 RECORDS').length).toBeGreaterThan(0);
  });

  it('renders renamed report titles and inline field selection for CSV exports', () => {
    render(<Reports />);

    expect(screen.getAllByText('Fleet Asset Register').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Parts Inventory Snapshot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('QR Scan Evidence Log').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Operator Daily Check-In Ledger').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Quick Form Submission Ledger').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alternate Parts Cross-Reference').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fields to export').length).toBeGreaterThan(0);
  });

  it('shows single export actions for CSV reports on desktop layout', () => {
    render(<Reports />);

    const exportButtons = screen.getAllByRole('button', { name: /^export$/i });
    expect(exportButtons.length).toBeGreaterThan(0);
  });

  it('disables export actions when record count is zero', () => {
    setupMocks({ recordCount: 0 });
    render(<Reports />);

    expect(screen.getAllByText('NO RECORDS').length).toBeGreaterThan(0);

    const exportPacketButtons = screen.getAllByRole('button', { name: /export packet/i });
    exportPacketButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });

    const exportButtons = screen.getAllByRole('button', { name: /^export$/i });
    exportButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('shows no-organization state', () => {
    setupMocks({ hasOrganization: false });
    render(<Reports />);

    expect(screen.getByText('No Organization Selected')).toBeInTheDocument();
    expect(screen.queryByText('Fleet Asset Register')).not.toBeInTheDocument();
  });

  it('shows access-restricted state for users without export roles', () => {
    setupMocks({ canExport: false, isScopedViewer: false });
    render(<Reports />);

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.queryByText('Fleet Asset Register')).not.toBeInTheDocument();
  });

  it('renders scoped work order export console for team viewers', () => {
    setupMocks({ isScopedViewer: true });
    render(<Reports />);

    expect(screen.getByRole('heading', { name: /work order exports/i })).toBeInTheDocument();
    expect(screen.getAllByText('Work Order Summary').length).toBeGreaterThan(0);
    expect(screen.queryByText('Fleet Asset Register')).not.toBeInTheDocument();
    expect(screen.queryByText(/primary export/i)).not.toBeInTheDocument();
  });

  it('shows Google Workspace connection status in the status strip', () => {
    setupMocks({ isGoogleConnected: true });
    render(<Reports />);

    const statusStrip = screen.getByLabelText(/export console status/i);
    expect(within(statusStrip).getByText('Connected')).toBeInTheDocument();
  });
});
