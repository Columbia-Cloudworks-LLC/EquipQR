import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  WorkOrderDetailsMobileContent,
  type WorkOrderDetailsMobileContentProps,
} from '@/features/work-orders/components/WorkOrderDetailsMobileContent';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

vi.mock('@/features/work-orders/hooks/useWorkOrderStatusChangeHandlers', () => ({
  useWorkOrderStatusChangeHandlers: () => ({
    updateStatusMutation: { isPending: false, mutateAsync: vi.fn() },
    acceptanceMutation: { isPending: false },
    isManager: true,
    isTechnician: true,
    canPerformStatusActions: () => true,
    canCompleteWorkOrder: () => true,
  }),
}));

vi.mock('@/features/work-orders/components/MobileWorkOrderCompactSummary', () => ({
  MobileWorkOrderCompactSummary: () => <div>Compact summary</div>,
}));

vi.mock('@/features/work-orders/components/WorkOrderDetailsMobile', () => ({
  WorkOrderDetailsMobile: () => null,
}));

vi.mock('@/features/work-orders/components/PMChecklistComponent', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderImagesSection', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderNotesSection', () => ({
  default: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderCostsSection', () => ({
  default: () => <div>Work order costs</div>,
}));

vi.mock('@/features/work-orders/components/WorkOrderDetailsPMInfo', () => ({
  WorkOrderDetailsPMInfo: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderHistoricalTimelineSection', () => ({
  WorkOrderHistoricalTimelineSection: () => null,
}));

vi.mock('@/features/work-orders/components/WorkOrderPMManagementActions', () => ({
  WorkOrderPMManagementActions: () => null,
}));

vi.mock('@/features/teams/components/CustomerContactActions', () => ({
  default: ({ emptyLabel }: { emptyLabel?: string }) => (
    <p>{emptyLabel ?? 'Customer contact actions'}</p>
  ),
}));

const workOrder = {
  id: 'wo-1',
  title: 'Hydraulic repair',
  status: 'in_progress',
  priority: 'high',
  has_pm: true,
  assignee_id: 'user-1',
  created_by: 'user-2',
  created_date: '2026-01-01T00:00:00Z',
  due_date: '2026-06-01T12:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  equipment_id: 'eq-1',
  organization_id: 'org-1',
  team_id: 'team-1',
  is_historical: false,
} as WorkOrder;

const equipment = {
  id: 'eq-1',
  organization_id: 'org-1',
  name: 'Excavator 1',
  team_id: 'team-1',
  customer_id: 'cust-1',
};

const noop = vi.fn();
const emptyRef = { current: null };

function renderMobileContent(
  overrides: Partial<WorkOrderDetailsMobileContentProps> = {},
) {
  render(
    <WorkOrderDetailsMobileContent
      workOrder={workOrder}
      equipment={equipment as WorkOrderDetailsMobileContentProps['equipment']}
      pmData={{
        id: 'pm-1',
        status: 'in_progress',
        checklist_data: [],
      } as WorkOrderDetailsMobileContentProps['pmData']}
      currentOrganization={{ id: 'org-1', name: 'Test Org' }}
      permissionLevels={{ isManager: true, isTechnician: true }}
      pmChecklist={{ progress: 1, total: 3 }}
      pmLoading={false}
      isWorkOrderLocked={false}
      canAddNotes={true}
      canUsePrivateNotes={true}
      canUpload={true}
      canAddCosts={true}
      canEditCosts={true}
      canViewWorkOrderCosts={true}
      hideInlineNoteAddButton={true}
      shouldAutoOpenNoteForm={false}
      openNoteFormTrigger={0}
      openCaptureTrigger={0}
      showMobileActionFooter={true}
      footerRoleEligible={true}
      syncState={{
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
        failedCount: 0,
      }}
      mobileReviewOpen={false}
      onMobileReviewOpenChange={noop}
      pmSectionRef={emptyRef}
      notesSectionRef={emptyRef}
      costsSectionRef={emptyRef}
      stagger={() => ({})}
      onAcceptWorkOrder={noop}
      onStartWork={noop}
      onResumeWork={noop}
      onPutAssignedOnHold={noop}
      onContinueChecklist={noop}
      onAddNote={noop}
      onAddPhoto={noop}
      onComplete={noop}
      baseCanAddNotes={false}
      {...overrides}
    />,
  );
}

describe('WorkOrderDetailsMobileContent', () => {
  it('keeps Next step on the canvas in field mode without capture buttons', () => {
    renderMobileContent({ showMobileActionFooter: true });

    expect(screen.getByRole('heading', { name: /next step/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue checklist/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add note/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^photo$/i })).not.toBeInTheDocument();
  });

  it('shows Reopen work order on a locked completed work order', () => {
    renderMobileContent({
      workOrder: { ...workOrder, status: 'completed' },
      isWorkOrderLocked: true,
      baseCanAddNotes: true,
      showMobileActionFooter: false,
      footerRoleEligible: false,
    });

    expect(screen.getByRole('button', { name: /reopen work order/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revert to accepted/i })).not.toBeInTheDocument();
  });

  it('shows Customer Contacts for managers when the equipment has a customer', () => {
    renderMobileContent();

    expect(screen.getByRole('heading', { name: /customer contacts/i })).toBeInTheDocument();
    expect(screen.getByText('No QuickBooks contacts synced yet.')).toBeInTheDocument();
  });

  it('hides Customer Contacts from requestors', () => {
    renderMobileContent({
      permissionLevels: { isManager: false, isTechnician: false },
    });

    expect(screen.queryByRole('heading', { name: /customer contacts/i })).not.toBeInTheDocument();
  });

  it('does not show workflow CTAs for requestors on submitted work orders', () => {
    renderMobileContent({
      workOrder: { ...workOrder, status: 'submitted' },
      permissionLevels: { isManager: false, isTechnician: false },
      footerRoleEligible: true,
      showMobileActionFooter: false,
    });

    expect(screen.queryByRole('button', { name: /accept work order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start work/i })).not.toBeInTheDocument();
  });

  it('keeps work order costs hidden when the viewer cannot see shop costs', () => {
    renderMobileContent({
      permissionLevels: { isManager: false, isTechnician: false },
      canViewWorkOrderCosts: false,
    });

    expect(screen.queryByText('Work order costs')).not.toBeInTheDocument();
  });
});
