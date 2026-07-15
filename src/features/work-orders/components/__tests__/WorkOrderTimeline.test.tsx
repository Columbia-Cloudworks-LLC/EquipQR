import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkOrderTimeline from '@/features/work-orders/components/WorkOrderTimeline';

const mockUseWorkOrderTimeline = vi.fn();

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({
    formatDateTime: (value: string) => value,
  }),
}));

vi.mock('@/features/work-orders/hooks/useHistoricalWorkOrders', () => ({
  useWorkOrderTimeline: (...args: unknown[]) => mockUseWorkOrderTimeline(...args),
}));

describe('WorkOrderTimeline', () => {
  it('does not synthesize an updated_at event for historical work orders', () => {
    mockUseWorkOrderTimeline.mockReturnValue({
      data: [
        {
          id: 'history-1',
          work_order_id: 'wo-1',
          old_status: null,
          new_status: 'submitted',
          changed_by: 'user-1',
          changed_at: '2024-01-01T08:00:00Z',
          reason: 'Historical work order created',
          metadata: null,
          is_historical_creation: true,
          profiles: { name: 'Admin User' },
        },
        {
          id: 'history-2',
          work_order_id: 'wo-1',
          old_status: 'submitted',
          new_status: 'completed',
          changed_by: 'user-1',
          changed_at: '2024-01-05T16:00:00Z',
          reason: 'Historical status recorded',
          metadata: null,
          is_historical_creation: true,
          profiles: { name: 'Admin User' },
        },
      ],
      isLoading: false,
    });

    render(
      <WorkOrderTimeline
        workOrder={{
          id: 'wo-1',
          organization_id: 'org-1',
          equipment_id: 'equipment-1',
          title: 'Historical WO',
          description: 'Test',
          priority: 'medium',
          status: 'completed',
          created_by: 'user-1',
          created_date: '2024-01-01T08:00:00Z',
          updated_at: '2026-06-29T12:00:00Z',
          is_historical: true,
        }}
        showDetailedHistory
      />,
    );

    expect(screen.getByText('Historical record')).toBeInTheDocument();
    expect(screen.getByText('2024-01-05T16:00:00Z')).toBeInTheDocument();
    expect(screen.queryByText('2026-06-29T12:00:00Z')).not.toBeInTheDocument();
    expect(screen.getByTestId('historical-import-banner')).toHaveTextContent(
      /2 historical entries imported from paper records/i,
    );
    expect(screen.getAllByText('Historical import')).toHaveLength(2);
  });

  it('shows one consolidated creation event for a fresh assigned work order', () => {
    mockUseWorkOrderTimeline.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(
      <WorkOrderTimeline
        workOrder={{
          id: 'wo-2',
          organization_id: 'org-1',
          equipment_id: 'equipment-1',
          title: 'Fresh WO',
          description: 'Test',
          priority: 'medium',
          status: 'assigned',
          created_by: 'user-1',
          created_date: '2026-07-14T15:39:00Z',
          updated_at: '2026-07-14T15:39:00Z',
          createdByName: 'Nicholas King',
          assigneeName: 'Nicholas King',
          is_historical: false,
        }}
        showDetailedHistory
      />,
    );

    expect(screen.getByText('Work Order Created & Assigned')).toBeInTheDocument();
    expect(
      screen.getByText('Submitted by Nicholas King • Assigned to Nicholas King'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Work Order Created', { exact: true })).not.toBeInTheDocument();
    expect(screen.getAllByText('Work Order Created & Assigned')).toHaveLength(1);
  });

  it('adds a distinct current status event when history ends before the live status', () => {
    mockUseWorkOrderTimeline.mockReturnValue({
      data: [
        {
          id: 'history-1',
          work_order_id: 'wo-3',
          old_status: null,
          new_status: 'submitted',
          changed_by: 'user-1',
          changed_at: '2026-07-14T10:00:00Z',
          reason: null,
          metadata: null,
          is_historical_creation: false,
          profiles: { name: 'Nicholas King' },
        },
        {
          id: 'history-2',
          work_order_id: 'wo-3',
          old_status: 'submitted',
          new_status: 'assigned',
          changed_by: 'user-1',
          changed_at: '2026-07-14T11:00:00Z',
          reason: null,
          metadata: null,
          is_historical_creation: false,
          profiles: { name: 'Nicholas King' },
        },
      ],
      isLoading: false,
    });

    render(
      <WorkOrderTimeline
        workOrder={{
          id: 'wo-3',
          organization_id: 'org-1',
          equipment_id: 'equipment-1',
          title: 'In progress WO',
          description: 'Test',
          priority: 'medium',
          status: 'in_progress',
          created_by: 'user-1',
          created_date: '2026-07-14T10:00:00Z',
          updated_at: '2026-07-14T12:00:00Z',
          assigneeName: 'Nicholas King',
          is_historical: false,
        }}
        showDetailedHistory
      />,
    );

    expect(screen.getByText('Work Started')).toBeInTheDocument();
    expect(screen.getByText('Work Assigned')).toBeInTheDocument();
    expect(screen.queryByText('Work Order Created & Assigned')).not.toBeInTheDocument();
  });
});
