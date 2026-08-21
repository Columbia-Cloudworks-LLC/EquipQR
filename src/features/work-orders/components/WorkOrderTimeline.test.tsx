import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkOrderTimeline from '@/features/work-orders/components/WorkOrderTimeline';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

const mockUseWorkOrderTimeline = vi.fn();

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({
    formatDateTime: (value: string) => value,
  }),
}));

vi.mock('@/hooks/useResolvedAvatarUrl', () => ({
  useResolvedAvatarUrl: () => ({ data: null }),
}));

vi.mock('@/features/work-orders/hooks/useHistoricalWorkOrders', () => ({
  useWorkOrderTimeline: (...args: unknown[]) => mockUseWorkOrderTimeline(...args),
}));

const buildWorkOrder = (overrides: Partial<WorkOrder> = {}): WorkOrder => ({
  id: 'wo-1',
  organization_id: 'org-1',
  equipment_id: 'equipment-1',
  title: 'Work Order',
  description: 'Test',
  priority: 'medium',
  status: 'completed',
  created_by: 'user-1',
  created_date: '2024-01-01T08:00:00Z',
  updated_at: '2024-01-01T08:00:00Z',
  has_pm: false,
  pm_required: false,
  is_historical: false,
  acceptance_date: null,
  assignee_id: null,
  assignee_name: null,
  team_id: null,
  created_by_admin: null,
  created_by_name: null,
  completed_date: null,
  due_date: null,
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
  ...overrides,
});

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
        workOrder={buildWorkOrder({
          title: 'Historical WO',
          updated_at: '2026-06-29T12:00:00Z',
          is_historical: true,
        })}
        showDetailedHistory
      />,
    );

    expect(screen.getByTestId('timeline-edited-indicator')).toBeInTheDocument();
    expect(screen.getByLabelText('Edited timeline')).toBeInTheDocument();
    expect(screen.getByText('2024-01-05T16:00:00Z')).toBeInTheDocument();
    expect(screen.queryByText('2026-06-29T12:00:00Z')).not.toBeInTheDocument();
    expect(screen.getAllByText('Admin User')).toHaveLength(2);
  });

  it('shows one consolidated creation event for a fresh assigned work order', () => {
    mockUseWorkOrderTimeline.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(
      <WorkOrderTimeline
        workOrder={buildWorkOrder({
          id: 'wo-2',
          title: 'Fresh WO',
          status: 'assigned',
          created_date: '2026-07-14T15:39:00Z',
          updated_at: '2026-07-14T15:39:00Z',
          createdByName: 'Nicholas King',
          assigneeName: 'Nicholas King',
        })}
        showDetailedHistory
      />,
    );

    expect(screen.getByText('Created & Assigned')).toBeInTheDocument();
    expect(screen.getByText('Nicholas King')).toBeInTheDocument();
    expect(
      screen.getByText('Submitted by Nicholas King • Assigned to Nicholas King'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Created', { exact: true })).not.toBeInTheDocument();
    expect(screen.getAllByText('Created & Assigned')).toHaveLength(1);
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
        workOrder={buildWorkOrder({
          id: 'wo-3',
          title: 'In progress WO',
          status: 'in_progress',
          created_date: '2026-07-14T10:00:00Z',
          updated_at: '2026-07-14T12:00:00Z',
          assigneeName: 'Nicholas King',
        })}
        showDetailedHistory
      />,
    );

    expect(screen.getByText('Work Started')).toBeInTheDocument();
    expect(screen.getByText('Work Assigned')).toBeInTheDocument();
    expect(screen.queryByText('Created & Assigned')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline-edited-indicator')).not.toBeInTheDocument();
  });
});
