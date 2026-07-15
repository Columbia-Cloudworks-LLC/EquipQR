import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkOrderHistoricalTimelineSection } from '@/features/work-orders/components/WorkOrderHistoricalTimelineSection';
import WorkOrderNotesSection from '@/features/work-orders/components/WorkOrderNotesSection';
import WorkOrderImagesSection from '@/features/work-orders/components/WorkOrderImagesSection';
import PMChecklistComponent from '@/features/work-orders/components/PMChecklistComponent';
import WorkOrderCostsSection from '@/features/work-orders/components/WorkOrderCostsSection';
import { WorkOrderDetailsPMInfo } from '@/features/work-orders/components/WorkOrderDetailsPMInfo';
import {
  WorkOrderAuditLogLink,
  WorkOrderPMChecklistLoadingCard,
} from '@/features/work-orders/components/WorkOrderDetailsSharedCards';
import { WorkOrderDetailsMobile } from '@/features/work-orders/components/WorkOrderDetailsMobile';
import { MobileWorkOrderCompactSummary } from '@/features/work-orders/components/MobileWorkOrderCompactSummary';
import { MobileWorkOrderStatusSheet } from '@/features/work-orders/components/MobileWorkOrderStatusSheet';
import { MobileWorkOrderFieldNextAction } from '@/features/work-orders/components/MobileWorkOrderFieldNextAction';
import { buildWorkOrderStatusActions } from '@/features/work-orders/utils/buildWorkOrderStatusActions';
import { useWorkOrderStatusChangeHandlers } from '@/features/work-orders/hooks/useWorkOrderStatusChangeHandlers';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import type { EquipmentLocationEditProps } from '@/components/location/equipmentLocationEditProps';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { PMChecklistStats } from '@/features/work-orders/utils/pmChecklistStats';
import type { WorkOrder, WorkOrderEmbeddedEquipment } from '@/features/work-orders/types/workOrder';
import { WorkOrderPMManagementActions } from '@/features/work-orders/components/WorkOrderPMManagementActions';

type StaggerProps = (index: number) => {
  className?: string;
  style?: React.CSSProperties;
};

type WorkOrderDetailsEquipment = EquipmentWithTeam | WorkOrderEmbeddedEquipment;

export interface WorkOrderDetailsMobileContentProps {
  workOrder: WorkOrder;
  equipment?: WorkOrderDetailsEquipment;
  pmData?: PreventativeMaintenance | null;
  currentOrganization: { id: string; name: string; scanLocationCollectionEnabled?: boolean };
  permissionLevels: {
    isManager: boolean;
    isTechnician: boolean;
  };
  pmChecklist: PMChecklistStats;
  pmLoading: boolean;
  isWorkOrderLocked: boolean;
  canAddNotes: boolean;
  canUsePrivateNotes: boolean;
  canUpload: boolean;
  canAddCosts: boolean;
  canEditCosts: boolean;
  canViewWorkOrderCosts: boolean;
  hideInlineNoteAddButton: boolean;
  shouldAutoOpenNoteForm: boolean;
  openNoteFormTrigger: number;
  openCaptureTrigger: number;
  showMobileActionFooter: boolean;
  footerRoleEligible: boolean;
  syncState: {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    failedCount: number;
  };
  assigneeNameSummary?: AssigneeNameSummary;
  mobileAssigneeSummary?: { id: string; name: string };
  mobileReviewOpen: boolean;
  onMobileReviewOpenChange: (open: boolean) => void;
  pmSectionRef: React.RefObject<HTMLDivElement | null>;
  notesSectionRef: React.RefObject<HTMLDivElement | null>;
  costsSectionRef: React.RefObject<HTMLDivElement | null>;
  stagger: StaggerProps;
  onAcceptWorkOrder: () => void;
  onStartWork: () => void;
  onResumeWork: () => void;
  onPutAssignedOnHold: () => void;
  onContinueChecklist: () => void;
  onAddNote: () => void;
  onAddPhoto: () => void;
  onComplete: () => void;
  onRetrySync: () => void;
  canEditInlineFields?: boolean;
  canEditAssignment?: boolean;
  onSaveDescription?: (description: string) => Promise<void>;
  equipmentLocationEdit?: EquipmentLocationEditProps;
  canManagePM?: boolean;
  onManagePM?: () => void;
}

export function WorkOrderDetailsMobileContent({
  workOrder,
  equipment,
  pmData,
  currentOrganization,
  permissionLevels,
  pmChecklist,
  pmLoading,
  isWorkOrderLocked,
  canAddNotes,
  canUsePrivateNotes,
  canUpload,
  canAddCosts,
  canEditCosts,
  canViewWorkOrderCosts,
  hideInlineNoteAddButton,
  shouldAutoOpenNoteForm,
  openNoteFormTrigger,
  openCaptureTrigger,
  showMobileActionFooter,
  footerRoleEligible,
  syncState,
  teamSummary,
  assigneeNameSummary,
  mobileAssigneeSummary,
  mobileReviewOpen,
  onMobileReviewOpenChange,
  pmSectionRef,
  notesSectionRef,
  costsSectionRef,
  stagger,
  onAcceptWorkOrder,
  onStartWork,
  onResumeWork,
  onPutAssignedOnHold,
  onContinueChecklist,
  onAddNote,
  onAddPhoto,
  onComplete,
  onRetrySync,
  canEditInlineFields = false,
  canEditAssignment = false,
  onSaveDescription,
  equipmentLocationEdit,
  canManagePM = false,
  onManagePM,
}: WorkOrderDetailsMobileContentProps) {
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const {
    updateStatusMutation,
    acceptanceMutation,
    isManager,
    isTechnician,
    canPerformStatusActions,
    canCompleteWorkOrder,
  } = useWorkOrderStatusChangeHandlers(
    {
      id: workOrder.id,
      status: workOrder.status,
      has_pm: workOrder.has_pm ?? false,
      assignee_id: workOrder.assignee_id,
      created_by: workOrder.created_by,
    },
    currentOrganization.id,
    () => {
      setShowStatusSheet(false);
      onAcceptWorkOrder();
    },
    () => {
      setShowStatusSheet(false);
      setShowCancelDialog(true);
    },
    () => {
      setShowStatusSheet(false);
      onComplete();
    },
  );

  const canChangeStatus =
    footerRoleEligible &&
    !isWorkOrderLocked &&
    workOrder.status !== 'completed' &&
    workOrder.status !== 'cancelled' &&
    canPerformStatusActions();

  const routeStatusChange = useCallback(
    (newStatus: WorkOrderStatus) => {
      setShowStatusSheet(false);

      switch (newStatus) {
        case 'accepted':
          onAcceptWorkOrder();
          return;
        case 'in_progress':
          if (workOrder.status === 'on_hold') {
            onResumeWork();
          } else {
            onStartWork();
          }
          return;
        case 'on_hold':
          if (workOrder.status === 'assigned' || workOrder.status === 'accepted') {
            onPutAssignedOnHold();
          } else {
            onResumeWork();
          }
          return;
        case 'completed':
          onComplete();
          return;
        case 'cancelled':
          setShowCancelDialog(true);
          return;
        default:
          return;
      }
    },
    [
      onAcceptWorkOrder,
      onComplete,
      onPutAssignedOnHold,
      onResumeWork,
      onStartWork,
      workOrder.status,
    ],
  );

  const statusActions = useMemo(
    () =>
      buildWorkOrderStatusActions({
        status: workOrder.status,
        canPerformStatusActions: canChangeStatus,
        isManager,
        isTechnician,
        canComplete: canCompleteWorkOrder(),
        onStatusChange: (status) => {
          routeStatusChange(status as WorkOrderStatus);
        },
      }),
    [
      canChangeStatus,
      canCompleteWorkOrder,
      isManager,
      isTechnician,
      routeStatusChange,
      workOrder.status,
    ],
  );

  const handleConfirmCancel = useCallback(async () => {
    try {
      await updateStatusMutation.mutateAsync({
        workOrderId: workOrder.id,
        status: 'cancelled',
        organizationId: currentOrganization.id,
      });
      setShowCancelDialog(false);
    } catch {
      // Mutation surfaces errors via toast/global handler
    }
  }, [currentOrganization.id, updateStatusMutation, workOrder.id]);

  return (
    <>
      <MobileWorkOrderCompactSummary
        workOrder={{
          id: workOrder.id,
          status: workOrder.status,
          priority: workOrder.priority,
          due_date: workOrder.due_date ?? undefined,
          assignee_id: workOrder.assignee_id,
          updated_at: workOrder.updated_at,
          equipment_id: workOrder.equipment_id,
          organization_id: workOrder.organization_id,
          equipmentTeamId: equipment?.team_id,
          invoice_status: workOrder.invoice_status,
          quickbooks_invoice_number: workOrder.quickbooks_invoice_number,
          invoice_balance_cents: workOrder.invoice_balance_cents,
          invoice_paid_at: workOrder.invoice_paid_at,
        }}
        assignee={assigneeNameSummary}
        organizationId={currentOrganization.id}
        canEditFields={canEditInlineFields}
        canEditAssignment={canEditAssignment}
        canChangeStatus={canChangeStatus}
        onStatusPress={canChangeStatus ? () => setShowStatusSheet(true) : undefined}
      />

      <MobileWorkOrderStatusSheet
        open={showStatusSheet}
        onOpenChange={setShowStatusSheet}
        currentStatus={workOrder.status}
        actions={statusActions}
        isPending={updateStatusMutation.isPending || acceptanceMutation.isPending}
      />

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel work order?</AlertDialogTitle>
            <AlertDialogDescription>
              This work order will be marked as cancelled. Logged hours, notes, and costs are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending}>Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateStatusMutation.isPending}
              onClick={() => void handleConfirmCancel()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateStatusMutation.isPending ? 'Cancelling...' : 'Cancel work order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div {...stagger(0)}>
        <WorkOrderDetailsMobile
          workOrder={{
            ...workOrder,
            created_at: workOrder.created_date,
            due_date: workOrder.due_date ?? undefined,
            estimated_hours: workOrder.estimated_hours ?? undefined,
            has_pm: workOrder.has_pm ?? undefined,
            pm_status: pmData?.status,
            pm_progress: pmChecklist.progress,
            pm_total: pmChecklist.total,
          }}
          equipment={equipment}
          team={teamSummary}
          assignee={mobileAssigneeSummary}
          organizationId={currentOrganization.id}
          scanLocationCollectionEnabled={currentOrganization.scanLocationCollectionEnabled}
          effectiveLocation={workOrder.effectiveLocation}
          canEditDescription={canEditInlineFields}
          onSaveDescription={onSaveDescription}
          equipmentLocationEdit={equipmentLocationEdit}
        />
      </div>

      {!showMobileActionFooter ? (
        <div {...stagger(1)}>
          <MobileWorkOrderFieldNextAction
            workOrder={{
              id: workOrder.id,
              status: workOrder.status,
              has_pm: workOrder.has_pm ?? false,
              updated_at: workOrder.updated_at,
            }}
            pm={{
              status: pmData?.status,
              progress: pmChecklist.progress,
              total: pmChecklist.total,
            }}
            permissions={{
              canAddNotes,
              canUpload,
              canWork: footerRoleEligible,
            }}
            sync={syncState}
            onAcceptWorkOrder={onAcceptWorkOrder}
            onStartWork={onStartWork}
            onResumeWork={onResumeWork}
            onContinueChecklist={onContinueChecklist}
            onAddNote={onAddNote}
            onAddPhoto={onAddPhoto}
            onComplete={onComplete}
            onRetrySync={onRetrySync}
          />
        </div>
      ) : null}

      <WorkOrderPMManagementActions
        canManage={canManagePM}
        hasPm={workOrder.has_pm}
        onManage={() => onManagePM?.()}
        className="mb-2"
      />

      {workOrder.has_pm && (permissionLevels.isManager || permissionLevels.isTechnician) && (
        <div {...stagger(2)}>
          <div ref={pmSectionRef}>
            {pmData && (
              <PMChecklistComponent
                pm={pmData}
                onUpdate={() => {
                  // Refresh PM data after updates
                }}
                readOnly={isWorkOrderLocked || (!permissionLevels.isManager && !permissionLevels.isTechnician)}
                isAdmin={permissionLevels.isManager}
                workOrder={workOrder}
                equipment={equipment}
                team={workOrder.team}
                organization={currentOrganization}
                assignee={workOrder.assignee}
              />
            )}
            {pmLoading && <WorkOrderPMChecklistLoadingCard />}
          </div>
        </div>
      )}

      <div {...stagger(3)}>
        <WorkOrderImagesSection
          workOrderId={workOrder.id}
          organizationId={workOrder.organization_id}
          canUpload={canUpload}
          showPrivateNotes={canUsePrivateNotes}
          primaryImageId={workOrder.primary_image_id}
        />
      </div>

      <div {...stagger(4)}>
        <div ref={notesSectionRef}>
          <WorkOrderNotesSection
            workOrderId={workOrder.id}
            workOrderTeamId={workOrder.team_id ?? undefined}
            canAddNotes={canAddNotes}
            showPrivateNotes={canUsePrivateNotes}
            showLaborHours={canViewWorkOrderCosts}
            isHistorical={Boolean(workOrder.is_historical)}
            canEditNoteTimestamps={permissionLevels.isManager}
            hideInlineAddButton={hideInlineNoteAddButton}
            autoOpenForm={shouldAutoOpenNoteForm}
            openFormTrigger={openNoteFormTrigger}
            openCaptureTrigger={openCaptureTrigger}
          />
        </div>
      </div>

      {canViewWorkOrderCosts && (
        <div {...stagger(5)} ref={costsSectionRef}>
          <WorkOrderCostsSection
            workOrderId={workOrder.id}
            canAddCosts={canAddCosts && !isWorkOrderLocked}
            canEditCosts={canEditCosts && !isWorkOrderLocked}
            primaryEquipmentId={workOrder.equipment_id}
            variant="mobileField"
          />
        </div>
      )}

      <div {...stagger(6)}>
        <Card className="shadow-elevation-2">
          <Collapsible open={mobileReviewOpen} onOpenChange={onMobileReviewOpenChange}>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left"
                >
                  <CardTitle className="text-lg">Timeline & office details</CardTitle>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-muted-foreground transition-transform',
                      mobileReviewOpen && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <WorkOrderDetailsPMInfo
                  workOrder={workOrder}
                  pmData={pmData}
                  permissionLevels={permissionLevels}
                />

                <WorkOrderHistoricalTimelineSection
                  workOrder={workOrder}
                  showDetailedHistory={permissionLevels.isManager}
                  canEditTimeline={permissionLevels.isManager}
                />

                {permissionLevels.isManager && (
                  <WorkOrderAuditLogLink workOrderId={workOrder.id} />
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </>
  );
}
