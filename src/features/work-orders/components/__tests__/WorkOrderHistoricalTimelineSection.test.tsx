import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkOrderHistoricalTimelineSection } from '@/features/work-orders/components/WorkOrderHistoricalTimelineSection';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

vi.mock('@/features/work-orders/components/WorkOrderTimeline', () => ({
  default: ({ headerAction }: { headerAction?: React.ReactNode }) => (
    <div data-testid="work-order-timeline">{headerAction}</div>
  ),
}));

vi.mock('@/features/work-orders/components/HistoricalTimelineEditorDialog', () => ({
  HistoricalTimelineEditorDialog: ({ open, title }: { open: boolean; title?: string }) =>
    open ? <div data-testid="timeline-editor">{title}</div> : null,
}));

vi.mock('@/features/work-orders/hooks/useHistoricalWorkOrders', () => ({
  useWorkOrderTimeline: () => ({
    data: [],
    isSuccess: true,
  }),
}));

const baseWorkOrder = {
  id: 'wo-1',
  organization_id: 'org-1',
  equipment_id: 'eq-1',
  title: 'Past repair',
  status: 'completed',
  created_date: '2026-06-20T12:00:00Z',
  completed_date: '2026-06-21T16:00:00Z',
  assignee_id: null,
  isHistorical: false,
  is_historical: false,
} as WorkOrder;

describe('WorkOrderHistoricalTimelineSection', () => {
  it('shows import action for non-historical work orders when admin can edit timeline', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderHistoricalTimelineSection
        workOrder={baseWorkOrder}
        canEditTimeline
      />,
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /import paper records/i }));

    expect(screen.getByTestId('timeline-editor')).toHaveTextContent(/import paper records/i);
  });

  it('shows edit action for historical work orders', () => {
    render(
      <WorkOrderHistoricalTimelineSection
        workOrder={{ ...baseWorkOrder, isHistorical: true, is_historical: true }}
        canEditTimeline
      />,
    );

    expect(screen.getByRole('button', { name: /edit historical timeline/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import paper records/i })).not.toBeInTheDocument();
  });

  it('hides conversion action when timeline editing is not allowed', () => {
    render(
      <WorkOrderHistoricalTimelineSection
        workOrder={baseWorkOrder}
        canEditTimeline={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /import paper records/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
});
