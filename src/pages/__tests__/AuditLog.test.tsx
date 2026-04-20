import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';

const mockUseOrganization = vi.fn();

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => mockUseOrganization(),
}));

vi.mock('@/hooks/useAuditLog', () => ({
  useAuditStats: () => ({
    data: {
      totalEntries: 42,
      byEntityType: {},
      byAction: { INSERT: 10, UPDATE: 25, DELETE: 7 },
      topActors: [],
    },
    isLoading: false,
  }),
  useOrganizationAuditLog: () => ({
    data: { data: [], totalCount: 0, hasMore: false },
    isLoading: false,
    error: null,
  }),
  useAuditTimeline: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
  useAuditExport: () => ({
    exportToCsv: vi.fn(),
    exportToJson: vi.fn(),
  }),
  deriveTimelineBucket: () => 'hour' as const,
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canManageOrganization: () => true,
  }),
}));

import AuditLog from '@/pages/AuditLog';

describe('AuditLog page', () => {
  it('renders the No Organization Selected alert when no org is active', () => {
    mockUseOrganization.mockReturnValue({ currentOrganization: null });

    render(<AuditLog />);

    expect(screen.getByText(/No Organization Selected/i)).toBeInTheDocument();
    expect(screen.queryByTestId('audit-explorer')).not.toBeInTheDocument();
  });

  it('renders the explorer (and stats cards) for an active org member', () => {
    mockUseOrganization.mockReturnValue({
      currentOrganization: { id: 'org-1', name: 'Acme Org' },
    });

    render(<AuditLog />);

    // Page header is present.
    expect(screen.getByRole('heading', { name: /Audit Log/i })).toBeInTheDocument();
    // Stats cards render with the mocked totals.
    expect(screen.getByText(/Total Entries/i)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    // The explorer is mounted.
    expect(screen.getByTestId('audit-explorer')).toBeInTheDocument();
    // Legacy table is gone — sentinel headers from the old design must not appear.
    expect(screen.queryByText(/Top Contributors/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/What's Tracked/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Data Retention/i)).not.toBeInTheDocument();
  });
});
