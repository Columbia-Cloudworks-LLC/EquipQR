import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuditLogTimelineRow,
  FormattedAuditEntry,
} from '@/types/audit';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const exportToCsvMock = vi.fn();
const exportToJsonMock = vi.fn();
const useOrganizationAuditLogMock = vi.fn();
const useAuditTimelineMock = vi.fn();

vi.mock('@/hooks/useAuditLog', () => ({
  useOrganizationAuditLog: (orgId: string, filters: unknown, pagination: unknown) =>
    useOrganizationAuditLogMock(orgId, filters, pagination),
  useAuditTimeline: (orgId: string, params: unknown) => useAuditTimelineMock(orgId, params),
  useAuditExport: () => ({ exportToCsv: exportToCsvMock, exportToJson: exportToJsonMock }),
  useAuditStats: () => ({
    data: {
      totalEntries: 3,
      byEntityType: {},
      byAction: { INSERT: 1, UPDATE: 1, DELETE: 1 },
      topActors: [],
    },
    isLoading: false,
  }),
  deriveTimelineBucket: () => 'hour' as const,
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canManageOrganization: () => true,
  }),
}));

// Capture the histogram's onBucketClick prop so the test can fire it directly.
let capturedOnBucketClick: ((iso: string) => void) | undefined;
vi.mock('./AuditTimelineHistogram', () => ({
  AuditTimelineHistogram: ({
    onBucketClick,
  }: {
    onBucketClick?: (iso: string) => void;
  }) => {
    capturedOnBucketClick = onBucketClick;
    return <div data-testid="histogram-stub" />;
  },
}));

// Stub the resizable panels so the layout renders even without a real layout
// engine; we just want to verify the panels are present.
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({
    children,
    id,
  }: {
    children: React.ReactNode;
    id?: string;
  }) => (
    <div data-testid="resizable-panel-group" data-resizable-group-id={id}>
      {children}
    </div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel">{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

// Stub the toolbar — the explorer commit ships against the legacy interface;
// the toolbar refactor lands in a follow-up commit.
vi.mock('@/components/audit/AuditLogToolbar', () => ({
  default: () => <div data-testid="audit-log-toolbar" />,
}));

// Import after mocks so the explorer pulls the mocked hooks.
import { AuditExplorer } from './AuditExplorer';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEntry(id: string): FormattedAuditEntry {
  return {
    id,
    organization_id: 'org-1',
    entity_type: 'equipment',
    entity_id: 'ent-' + id,
    entity_name: 'Forklift ' + id,
    action: 'UPDATE',
    actor_id: 'actor-1',
    actor_name: 'Test User',
    actor_email: 'test@example.com',
    changes: {},
    metadata: {},
    created_at: '2026-04-20T10:00:00.000Z',
    actionLabel: 'Updated',
    entityTypeLabel: 'Equipment',
    formattedDate: 'Apr 20, 2026 10:00 AM',
    relativeTime: 'just now',
    changeCount: 0,
  };
}

const sampleTimeline: AuditLogTimelineRow[] = [
  { bucket: '2026-04-20T10:00:00.000Z', action: 'UPDATE', count: 4 },
];

beforeEach(() => {
  exportToCsvMock.mockReset();
  exportToJsonMock.mockReset();
  capturedOnBucketClick = undefined;
  globalThis.localStorage?.clear();

  useOrganizationAuditLogMock.mockReturnValue({
    data: {
      data: [makeEntry('a'), makeEntry('b'), makeEntry('c')],
      totalCount: 3,
      hasMore: false,
    },
    isLoading: false,
    error: null,
  });

  useAuditTimelineMock.mockReturnValue({
    data: sampleTimeline,
    isLoading: false,
    error: null,
  });
});

describe('AuditExplorer', () => {
  it('uses last_30d as the default time range preset', () => {
    render(<AuditExplorer organizationId="org-1" />);

    const initialQueryArgs = useOrganizationAuditLogMock.mock.calls.at(0)?.[1] as
      | { dateFrom?: string; dateTo?: string }
      | undefined;
    expect(initialQueryArgs?.dateFrom).toBeTruthy();
    expect(initialQueryArgs?.dateTo).toBeTruthy();
    const from = new Date(initialQueryArgs!.dateFrom!);
    const to = new Date(initialQueryArgs!.dateTo!);
    const spanDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(spanDays).toBeGreaterThanOrEqual(29.5);
    expect(spanDays).toBeLessThanOrEqual(30.5);
  });

  it('renders the dashboard grid widgets (metrics, timeline, events)', () => {
    render(<AuditExplorer organizationId="org-1" />);

    expect(screen.getByTestId('audit-explorer')).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('audit-dashboard-grid')).toBeInTheDocument();
    expect(screen.getByTestId('audit-widget-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('audit-widget-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('audit-widget-events')).toBeInTheDocument();
    expect(screen.getByTestId('histogram-stub')).toBeInTheDocument();
    expect(screen.getByTestId('audit-stats-cards')).toBeInTheDocument();
  });

  it('shows the events table full width until a row is selected (#1166)', () => {
    render(<AuditExplorer organizationId="org-1" />);

    // No selection: no split panel, no detail pane.
    expect(screen.queryByTestId('resizable-panel-group')).not.toBeInTheDocument();
    expect(screen.queryByTestId('audit-detail-panel')).not.toBeInTheDocument();

    const rows = screen.getAllByTestId('audit-log-list-row');
    fireEvent.click(rows[1]);

    expect(screen.getByTestId('resizable-panel-group')).toBeInTheDocument();
    expect(screen.getByTestId('audit-detail-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Forklift b/i })).toBeInTheDocument();
  });

  it('clicking the sole selected row again returns the table to full width', () => {
    render(<AuditExplorer organizationId="org-1" />);

    const rows = screen.getAllByTestId('audit-log-list-row');
    fireEvent.click(rows[0]);
    expect(screen.getByTestId('audit-detail-panel')).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('audit-log-list-row')[0]);
    expect(screen.queryByTestId('audit-detail-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resizable-panel-group')).not.toBeInTheDocument();
  });

  it('shows the bulk actions pane when multiple rows are selected (#1166)', () => {
    render(<AuditExplorer organizationId="org-1" />);

    const rows = screen.getAllByTestId('audit-log-list-row');
    fireEvent.click(rows[0]);
    fireEvent.click(screen.getAllByTestId('audit-log-list-row')[2], { ctrlKey: true });

    expect(screen.queryByTestId('audit-detail-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('audit-bulk-actions-panel')).toBeInTheDocument();
    expect(screen.getByText(/2 entries selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /markdown \(\.md\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excel \(\.xlsx\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf \(\.pdf\)/i })).toBeInTheDocument();

    // Clearing returns to the full-width table.
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.queryByTestId('audit-bulk-actions-panel')).not.toBeInTheDocument();
  });

  it('supports shift-click range selection', () => {
    render(<AuditExplorer organizationId="org-1" />);

    const rows = screen.getAllByTestId('audit-log-list-row');
    fireEvent.click(rows[0]);
    fireEvent.click(screen.getAllByTestId('audit-log-list-row')[2], { shiftKey: true });

    expect(screen.getByText(/3 entries selected/i)).toBeInTheDocument();
  });

  it('narrows the time range when a histogram bar is clicked', async () => {
    render(<AuditExplorer organizationId="org-1" />);

    expect(capturedOnBucketClick).toBeTypeOf('function');
    const initialQueryArgs = useOrganizationAuditLogMock.mock.calls.at(-1)?.[1] as
      | { dateFrom?: string; dateTo?: string }
      | undefined;
    expect(initialQueryArgs?.dateFrom).toBeTruthy();
    expect(initialQueryArgs?.dateTo).toBeTruthy();
    const initialDateTo = initialQueryArgs?.dateTo;

    await act(async () => {
      capturedOnBucketClick?.('2026-04-20T10:00:00.000Z');
    });

    await waitFor(() => {
      const updatedQueryArgs = useOrganizationAuditLogMock.mock.calls.at(-1)?.[1] as
        | { dateFrom?: string; dateTo?: string }
        | undefined;
      expect(updatedQueryArgs?.dateFrom).toBe('2026-04-20T10:00:00.000Z');
      // One bucket span (hour) after the bucket start.
      expect(updatedQueryArgs?.dateTo).toBe('2026-04-20T11:00:00.000Z');
      expect(updatedQueryArgs?.dateTo).not.toBe(initialDateTo);
    });
  });

  it('collapses and expands dashboard widgets', () => {
    render(<AuditExplorer organizationId="org-1" />);

    expect(screen.getByTestId('audit-stats-cards')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('audit-widget-collapse-metrics'));
    expect(screen.queryByTestId('audit-stats-cards')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('audit-widget-collapse-metrics'));
    expect(screen.getByTestId('audit-stats-cards')).toBeInTheDocument();
  });

  it('offers a reset-layout control and drag handles for each widget', () => {
    render(<AuditExplorer organizationId="org-1" />);

    expect(screen.getByTestId('audit-dashboard-reset-layout')).toBeInTheDocument();
    expect(screen.getByTestId('audit-widget-drag-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('audit-widget-drag-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('audit-widget-drag-events')).toBeInTheDocument();
  });
});
