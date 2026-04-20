import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@/test/utils/test-utils';
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
  deriveTimelineBucket: () => 'hour' as const,
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canManageOrganization: () => true,
  }),
}));

// Capture the histogram's onBucketClick prop so the test can fire it directly.
let capturedOnBucketClick: ((iso: string) => void) | undefined;
vi.mock('../AuditTimelineHistogram', () => ({
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
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel-group">{children}</div>
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
import { AuditExplorer } from '../AuditExplorer';

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
  it('renders histogram, toolbar, list, and detail panel inside resizable panels', () => {
    render(<AuditExplorer organizationId="org-1" />);

    expect(screen.getByTestId('audit-explorer')).toBeInTheDocument();
    expect(screen.getByTestId('histogram-stub')).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('resizable-panel-group')).toBeInTheDocument();
    expect(screen.getAllByTestId('resizable-panel')).toHaveLength(2);
    expect(screen.getByTestId('audit-detail-empty')).toBeInTheDocument();
  });

  it('shows the selected entry in the detail panel after a list-row click', () => {
    render(<AuditExplorer organizationId="org-1" />);

    expect(screen.getByTestId('audit-detail-empty')).toBeInTheDocument();

    const rows = screen.getAllByTestId('audit-log-list-row');
    fireEvent.click(rows[1]);

    expect(screen.queryByTestId('audit-detail-empty')).not.toBeInTheDocument();
    expect(screen.getByTestId('audit-detail-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Forklift b/i })).toBeInTheDocument();
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
});
