import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Clipboard, History } from 'lucide-react';
import { HistoryTab } from '@/components/audit';
import { cn } from '@/lib/utils';
import WorkOrderTimeline from '@/features/work-orders/components/WorkOrderTimeline';
import WorkOrderNotesSection from '@/features/work-orders/components/WorkOrderNotesSection';
import WorkOrderImagesSection from '@/features/work-orders/components/WorkOrderImagesSection';
import PMChecklistComponent from '@/features/work-orders/components/PMChecklistComponent';
import WorkOrderCostsSection from '@/features/work-orders/components/WorkOrderCostsSection';
import { WorkOrderDetailsPMInfo } from '@/features/work-orders/components/WorkOrderDetailsPMInfo';
import { WorkOrderDetailsMobile } from '@/features/work-orders/components/WorkOrderDetailsMobile';
import { MobileWorkOrderCompactSummary } from '@/features/work-orders/components/MobileWorkOrderCompactSummary';
import { MobileWorkOrderFieldNextAction } from '@/features/work-orders/components/MobileWorkOrderFieldNextAction';
import type { EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { PMChecklistStats } from '@/features/work-orders/utils/pmChecklistStats';
import type { WorkOrder, WorkOrderEmbeddedEquipment } from '@/features/work-orders/types/workOrder';
import type {
  AssigneeNameSummary,
  TeamSummary,
} from '@/features/work-orders/utils/workOrderDetailsViewModel';

type StaggerProps = (index: number) => {
  className?: string;
  style?: React.CSSProperties;
};

type WorkOrderDetailsEquipment = EquipmentWithTeam | WorkOrderEmbeddedEquipment;

export interface WorkOrderDetailsMobileContentProps {
  workOrder: WorkOrder;
  equipment?: WorkOrderDetailsEquipment;
  pmData?: PreventativeMaintenance | null;
  currentOrganization: { id: string; name: string };
  permissionLevels: {
    isManager: boolean;
    isTechnician: boolean;
  };
  pmChecklist: PMChecklistStats;
  pmLoading: boolean;
  isWorkOrderLocked: boolean;
  canAddNotes: boolean;
  canUpload: boolean;
  canAddCosts: boolean;
  canEditCosts: boolean;
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
  compactWorkOrderSummary: { status: string; priority: string; due_date?: string | null };
  compactEquipmentSummary?: { id: string; name: string; status: string };
  teamSummary?: TeamSummary;
  assigneeNameSummary?: AssigneeNameSummary;
  mobileAssigneeSummary?: { id: string; name: string };
  mobileReviewOpen: boolean;
  onMobileReviewOpenChange: (open: boolean) => void;
  pmSectionRef: React.RefObject<HTMLDivElement | null>;
  notesSectionRef: React.RefObject<HTMLDivElement | null>;
  stagger: StaggerProps;
  onAcceptWorkOrder: () => void;
  onStartWork: () => void;
  onResumeWork: () => void;
  onContinueChecklist: () => void;
  onAddNote: () => void;
  onAddPhoto: () => void;
  onComplete: () => void;
  onRetrySync: () => void;
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
  canUpload,
  canAddCosts,
  canEditCosts,
  hideInlineNoteAddButton,
  shouldAutoOpenNoteForm,
  openNoteFormTrigger,
  openCaptureTrigger,
  showMobileActionFooter,
  footerRoleEligible,
  syncState,
  compactWorkOrderSummary,
  compactEquipmentSummary,
  teamSummary,
  assigneeNameSummary,
  mobileAssigneeSummary,
  mobileReviewOpen,
  onMobileReviewOpenChange,
  pmSectionRef,
  notesSectionRef,
  stagger,
  onAcceptWorkOrder,
  onStartWork,
  onResumeWork,
  onContinueChecklist,
  onAddNote,
  onAddPhoto,
  onComplete,
  onRetrySync,
}: WorkOrderDetailsMobileContentProps) {
  return (
    <>
      <MobileWorkOrderCompactSummary
        workOrder={compactWorkOrderSummary}
        equipment={compactEquipmentSummary}
        team={teamSummary}
        assignee={assigneeNameSummary}
      />

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
          equipment={
            equipment
              ? {
                  id: equipment.id,
                  name: equipment.name,
                  manufacturer: equipment.manufacturer ?? undefined,
                  model: equipment.model ?? undefined,
                  serial_number: equipment.serial_number ?? undefined,
                  status: equipment.status,
                  location: equipment.location ?? undefined,
                  team_id: equipment.team_id,
                  custom_attributes: equipment.custom_attributes as Record<string, unknown> | null,
                  image_url: equipment.image_url,
                }
              : undefined
          }
          team={teamSummary}
          assignee={mobileAssigneeSummary}
          effectiveLocation={workOrder.effectiveLocation}
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
            {pmLoading && (
              <Card className="shadow-elevation-2" role="status" aria-label="Loading PM checklist">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clipboard className="h-5 w-5" />
                    Loading PM Checklist...
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-muted animate-pulse rounded" aria-hidden="true" />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <div {...stagger(3)}>
        <WorkOrderImagesSection
          workOrderId={workOrder.id}
          organizationId={workOrder.organization_id}
          canUpload={canUpload}
          showPrivateNotes={permissionLevels.isManager}
          primaryImageId={workOrder.primary_image_id}
        />
      </div>

      <div {...stagger(4)}>
        <div ref={notesSectionRef}>
          <WorkOrderNotesSection
            workOrderId={workOrder.id}
            canAddNotes={canAddNotes}
            showPrivateNotes={permissionLevels.isManager}
            hideInlineAddButton={hideInlineNoteAddButton}
            autoOpenForm={shouldAutoOpenNoteForm}
            openFormTrigger={openNoteFormTrigger}
            openCaptureTrigger={openCaptureTrigger}
          />
        </div>
      </div>

      {(permissionLevels.isManager || permissionLevels.isTechnician) && (
        <div {...stagger(5)}>
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
                  <CardTitle className="text-lg">Review & office details</CardTitle>
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

                <WorkOrderTimeline
                  workOrder={workOrder}
                  showDetailedHistory={permissionLevels.isManager}
                />

                {permissionLevels.isManager && currentOrganization && (
                  <Card className="shadow-elevation-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Change History (Field Edits)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3 text-sm text-muted-foreground">
                        Shows who changed work order fields and when.
                      </p>
                      <HistoryTab
                        entityType="work_order"
                        entityId={workOrder.id}
                        organizationId={currentOrganization.id}
                      />
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </>
  );
}
