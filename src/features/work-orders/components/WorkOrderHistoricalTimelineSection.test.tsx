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

const baseWorkOrder: WorkOrder = {
  id: 'wo-1',
  organization_id: 'org-1',
  equipment_id: 'eq-1',
  title: 'Past repair',
  description: 'Historical repair record',
  status: 'completed',
  priority: 'medium',
  created_by: 'user-1',
  created_date: '2026-06-20T12:00:00Z',
  completed_date: '2026-06-21T16:00:00Z',
  due_date: null,
  updated_at: '2026-06-21T16:00:00Z',
  has_pm: false,
  pm_required: false,
  is_historical: false,
  acceptance_date: null,
  assignee_id: null,
  assignee_name: null,
  team_id: null,
  created_by_admin: null,
  created_by_name: null,
  estimated_hours: null,
  historical_notes: null,
  historical_start_date: null,
  equipment_working_hours_at_creation: null,
  invoice_balance_cents: null,
  invoice_due_date: null,
  invoice_last_synced_at: null,
  invoice_paid_at: null,
  invoice_sent_at: null,
  invoice_status: null,
  invoice_sync_error: null,
  primary_image_id: null,
  quickbooks_invoice_environment: null,
  quickbooks_invoice_id: null,
  quickbooks_invoice_number: null,
  quickbooks_realm_id: null,
};

describe('WorkOrderHistoricalTimelineSection', () => {
  it('opens convert dialog when admin clicks Edit Timeline on a live work order', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderHistoricalTimelineSection
        workOrder={baseWorkOrder}
        canEditTimeline
      />,
    );

    await user.click(screen.getByRole('button', { name: /edit timeline/i }));

    expect(screen.getByTestId('timeline-editor')).toHaveTextContent(/timeline editor/i);
  });

  it('opens edit dialog when admin clicks Edit Timeline on a historical work order', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderHistoricalTimelineSection
        workOrder={{ ...baseWorkOrder, is_historical: true }}
        canEditTimeline
      />,
    );

    await user.click(screen.getByRole('button', { name: /edit timeline/i }));

    expect(screen.getByTestId('timeline-editor')).toHaveTextContent(/timeline editor/i);
  });

  it('hides Edit Timeline when timeline editing is not allowed', () => {
    render(
      <WorkOrderHistoricalTimelineSection
        workOrder={baseWorkOrder}
        canEditTimeline={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /edit timeline/i })).not.toBeInTheDocument();
  });
});
