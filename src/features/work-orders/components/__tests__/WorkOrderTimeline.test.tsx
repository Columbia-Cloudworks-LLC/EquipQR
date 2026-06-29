import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkOrderTimeline from '@/features/work-orders/components/WorkOrderTimeline';

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({
    formatDateTime: (value: string) => value,
  }),
}));

vi.mock('@/features/work-orders/hooks/useHistoricalWorkOrders', () => ({
  useWorkOrderTimeline: () => ({
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
        profiles: { name: 'Admin User' },
      },
    ],
    isLoading: false,
  }),
}));

describe('WorkOrderTimeline', () => {
  it('does not synthesize an updated_at event for historical work orders', () => {
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
  });
});
