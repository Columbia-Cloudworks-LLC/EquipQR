import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { WorkOrderDesktopCard } from './WorkOrderDesktopCard';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

/**
 * #1731: the assignee chip on a desktop work order card opens Quick
 * Assignment instead of navigating to the work order. Uses the real
 * WorkOrderAssignmentHover popover so portal event bubbling is exercised.
 */

const mockOnNavigate = vi.fn();
const mockGetDetailedPermissions = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: () => ({
    workOrders: {
      getDetailedPermissions: (...args: unknown[]) => mockGetDetailedPermissions(...args),
    },
  }),
}));

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({
    formatDate: (value?: Date | string | null) => (value ? String(value).slice(0, 10) : '—'),
    formatDateTime: (value?: Date | string | null) => (value ? String(value) : '—'),
    formatRelative: (value?: Date | string | null) => (value ? String(value) : '—'),
  }),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderContextualAssignment', () => ({
  useWorkOrderContextualAssignment: () => ({
    assignmentOptions: [{ id: 'user-3', name: 'Tina Tech', role: 'member' }],
    isLoading: false,
    error: null,
    equipmentHasNoTeam: false,
  }),
}));

vi.mock('@/hooks/useQuickWorkOrderAssignment', () => ({
  useQuickWorkOrderAssignment: () => ({ mutateAsync: mockMutateAsync }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../WorkOrderPrimaryActionButton', () => ({
  WorkOrderPrimaryActionButton: () => null,
}));

vi.mock('../PMProgressIndicator', () => ({
  default: () => null,
}));

vi.mock('../WorkOrderCostSubtotal', () => ({
  default: () => null,
}));

const workOrder: WorkOrder = {
  id: 'wo-1',
  title: 'Replace Hydraulic Filter',
  description: 'Swap the return filter',
  status: 'submitted',
  priority: 'medium',
  equipment_id: 'eq-1',
  organization_id: 'org-1',
  created_by: 'user-1',
  created_date: '2026-04-01T00:00:00Z',
  due_date: null,
  due_date_has_time: false,
  updated_at: '2026-04-01T00:00:00Z',
  has_pm: false,
  is_historical: false,
  pm_required: false,
  acceptance_date: null,
  assignee_id: null,
  assignee_name: null,
  equipmentTeamId: 'team-1',
  teamName: 'Heavy Equipment Team',
  equipmentTeamName: 'Heavy Equipment Team',
  equipmentName: 'John Deere 850L Dozer',
  created_by_admin: null,
  created_by_name: null,
  completed_date: null,
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

function renderCard() {
  return render(<WorkOrderDesktopCard workOrder={workOrder} onNavigate={mockOnNavigate} />);
}

describe('WorkOrderDesktopCard assignee chip (#1731)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
    mockGetDetailedPermissions.mockReturnValue({ canEdit: true, canEditAssignment: true });
  });

  it('opens Quick Assignment on click without navigating', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Unassigned' }));

    expect(await screen.findByText('Quick Assignment')).toBeInTheDocument();
    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate on clicks inside the popover content', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Unassigned' }));
    await screen.findByText('Quick Assignment');

    await user.click(screen.getByText('Quick Assignment'));
    await user.click(screen.getByRole('button', { name: /^unassign$/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ workOrderId: 'wo-1', assigneeId: null, organizationId: 'org-1' }),
    );
    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  it('opens Quick Assignment with Enter on the focused chip without navigating', async () => {
    const user = userEvent.setup();
    renderCard();

    screen.getByRole('button', { name: 'Unassigned' }).focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Quick Assignment')).toBeInTheDocument();
    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  it('still navigates when the rest of the card is clicked or activated by keyboard', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByText('Replace Hydraulic Filter'));
    expect(mockOnNavigate).toHaveBeenCalledWith('wo-1');

    mockOnNavigate.mockClear();
    const card = screen.getAllByRole('button').find((el) => el.getAttribute('tabindex') === '0');
    expect(card).toBeDefined();
    card!.focus();
    await user.keyboard('{Enter}');
    expect(mockOnNavigate).toHaveBeenCalledWith('wo-1');
  });

  it('renders plain text that navigates when the user cannot edit assignment', async () => {
    mockGetDetailedPermissions.mockReturnValue({ canEdit: false, canEditAssignment: false });
    const user = userEvent.setup();
    renderCard();

    expect(screen.queryByRole('button', { name: 'Unassigned' })).not.toBeInTheDocument();
    await user.click(screen.getByText('Unassigned'));

    expect(screen.queryByText('Quick Assignment')).not.toBeInTheDocument();
    expect(mockOnNavigate).toHaveBeenCalledWith('wo-1');
  });
});
