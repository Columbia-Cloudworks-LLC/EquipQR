import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils/test-utils';
import WorkOrderCard from '../WorkOrderCard';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

const mockOnNavigate = vi.fn();
const mockGetDetailedPermissions = vi.fn();

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: () => ({
    workOrders: {
      getDetailedPermissions: (...args: unknown[]) => mockGetDetailedPermissions(...args),
    },
  }),
}));

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({
    formatDate: (value?: string | null) => (value ? value.slice(0, 10) : '—'),
    formatRelative: (value?: string | null) => (value ? `relative:${value.slice(0, 10)}` : '—'),
  }),
}));

vi.mock('../WorkOrderQuickActions', () => ({
  WorkOrderQuickActions: () => <div data-testid="quick-actions" />,
}));

vi.mock('../WorkOrderPrimaryActionButton', () => ({
  WorkOrderPrimaryActionButton: () => <button type="button">Primary action</button>,
}));

vi.mock('../PMProgressIndicator', () => ({
  default: ({ showCount, variant }: { showCount?: boolean; variant?: string }) => (
    <div data-testid="pm-progress" data-show-count={String(Boolean(showCount))} data-variant={variant ?? 'default'} />
  ),
}));

vi.mock('../WorkOrderCostSubtotal', () => ({
  default: () => <span data-testid="cost-subtotal" />,
}));

vi.mock('../WorkOrderAssignmentHover', () => ({
  WorkOrderAssignmentHover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../QuickBooksInvoiceStatusBadge', () => ({
  default: () => null,
}));

const baseWorkOrder: WorkOrder = {
  id: 'wo-1',
  title: 'Replace hydraulic line',
  description: 'Repair the leaking boom hose',
  status: 'in_progress',
  priority: 'high',
  equipment_id: 'eq-1',
  organization_id: 'org-1',
  created_by: 'user-1',
  created_date: '2026-04-01T00:00:00Z',
  due_date: '2026-12-10T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  has_pm: false,
  is_historical: false,
  pm_required: false,
  acceptance_date: null,
  assignee_id: 'user-2',
  assignee_name: 'Alex Tech',
  assigneeName: 'Alex Tech',
  team_id: 'team-1',
  teamName: 'Field Crew',
  equipmentTeamName: 'Field Crew',
  equipmentName: 'Excavator A',
  equipmentModel: 'CAT 320',
  created_by_admin: null,
  created_by_name: null,
  completed_date: null,
  estimated_hours: 4,
  historical_notes: null,
  historical_start_date: null,
};

describe('WorkOrderCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDetailedPermissions.mockReturnValue({
      canEdit: true,
      canEditAssignment: true,
    });
  });

  describe('desktop variant', () => {
    it('renders title, status, priority, and metadata strip', () => {
      render(<WorkOrderCard workOrder={baseWorkOrder} onNavigate={mockOnNavigate} />);

      expect(screen.getByText('Replace hydraulic line')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText(/high/i)).toBeInTheDocument();
      expect(screen.getByText('Excavator A')).toBeInTheDocument();
      expect(screen.getByText('Alex Tech')).toBeInTheDocument();
      expect(screen.getByText('Field Crew')).toBeInTheDocument();
      expect(screen.getByText(/Due 2026-12-10/)).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    });

    it('navigates on click and keyboard activation', async () => {
      const user = userEvent.setup();
      render(<WorkOrderCard workOrder={baseWorkOrder} onNavigate={mockOnNavigate} />);

      const card = screen.getByText('Replace hydraulic line').closest('[role="button"]');
      expect(card).not.toBeNull();
      await user.click(card!);
      expect(mockOnNavigate).toHaveBeenCalledWith('wo-1');

      mockOnNavigate.mockClear();
      (card as HTMLElement).focus();
      await user.keyboard('{Enter}');
      expect(mockOnNavigate).toHaveBeenCalledWith('wo-1');
    });

    it('shows PM progress for active PM work orders', () => {
      render(
        <WorkOrderCard
          workOrder={{ ...baseWorkOrder, has_pm: true }}
          onNavigate={mockOnNavigate}
        />,
      );

      const pm = screen.getByTestId('pm-progress');
      expect(pm).toBeInTheDocument();
      expect(pm).toHaveAttribute('data-show-count', 'true');
    });

    it('hides PM progress for completed work orders', () => {
      render(
        <WorkOrderCard
          workOrder={{ ...baseWorkOrder, status: 'completed', has_pm: true, completed_date: '2026-04-12' }}
          onNavigate={mockOnNavigate}
        />,
      );

      expect(screen.queryByTestId('pm-progress')).not.toBeInTheDocument();
    });

    it('shows pending sync badge when merged work order is pending', () => {
      render(
        <WorkOrderCard
          workOrder={{ ...baseWorkOrder, _isPendingSync: true } as WorkOrder}
          onNavigate={mockOnNavigate}
        />,
      );

      expect(screen.getByText(/pending sync/i)).toBeInTheDocument();
    });
  });

  describe('mobile variant', () => {
    it('renders compact mobile layout with assignee and date label', () => {
      render(
        <WorkOrderCard
          workOrder={baseWorkOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
        />,
      );

      expect(screen.getByText('Replace hydraulic line')).toBeInTheDocument();
      expect(screen.getByText('Alex Tech')).toBeInTheDocument();
      expect(screen.getByText(/Due relative:2026-12-10/)).toBeInTheDocument();
    });

    it('shows overdue styling label when due date passed', () => {
      render(
        <WorkOrderCard
          workOrder={{
            ...baseWorkOrder,
            due_date: '2020-01-01T00:00:00Z',
            status: 'in_progress',
          }}
          variant="mobile"
          onNavigate={mockOnNavigate}
        />,
      );

      expect(screen.getByText(/Overdue relative:2020-01-01/)).toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    it('renders description and formatted created/due dates', () => {
      render(
        <WorkOrderCard
          workOrder={baseWorkOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />,
      );

      expect(screen.getByText('Repair the leaking boom hose')).toBeInTheDocument();
      expect(screen.getByText(/Created: 2026-04-01/)).toBeInTheDocument();
      expect(screen.getByText(/Due: 2026-12-10/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View Details' })).toBeInTheDocument();
    });
  });
});
