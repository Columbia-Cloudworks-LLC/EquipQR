import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clipboard, History } from 'lucide-react';
import { HistoryTab } from '@/components/audit';
import WorkOrderDetailsInfo from '@/features/work-orders/components/WorkOrderDetailsInfo';
import WorkOrderTimeline from '@/features/work-orders/components/WorkOrderTimeline';
import WorkOrderNotesSection from '@/features/work-orders/components/WorkOrderNotesSection';
import WorkOrderImagesSection from '@/features/work-orders/components/WorkOrderImagesSection';
import PMChecklistComponent from '@/features/work-orders/components/PMChecklistComponent';
import WorkOrderCostsSection from '@/features/work-orders/components/WorkOrderCostsSection';
import { WorkOrderDetailsPMInfo } from '@/features/work-orders/components/WorkOrderDetailsPMInfo';
import type { EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { WorkOrder, WorkOrderEmbeddedEquipment } from '@/features/work-orders/types/workOrder';

type StaggerProps = (index: number) => {
  className?: string;
  style?: React.CSSProperties;
};

type WorkOrderDetailsEquipment = EquipmentWithTeam | WorkOrderEmbeddedEquipment;

export interface WorkOrderDetailsDesktopContentProps {
  workOrder: WorkOrder;
  equipment?: WorkOrderDetailsEquipment;
  pmData?: PreventativeMaintenance | null;
  currentOrganization: { id: string; name: string };
  permissionLevels: {
    isManager: boolean;
    isTechnician: boolean;
  };
  selectedEquipmentId: string;
  pmLoading: boolean;
  isWorkOrderLocked: boolean;
  canAddNotes: boolean;
  canUpload: boolean;
  canAddCosts: boolean;
  canEditCosts: boolean;
  hideInlineNoteAddButton: boolean;
  shouldAutoOpenNoteForm: boolean;
  openNoteFormTrigger: number;
  teamData?: { name?: string | null };
  assigneeData?: { name?: string | null };
  pmSectionRef: React.RefObject<HTMLDivElement | null>;
  notesSectionRef: React.RefObject<HTMLDivElement | null>;
  stagger: StaggerProps;
  onPMUpdate: () => void;
}

export function WorkOrderDetailsDesktopContent({
  workOrder,
  equipment,
  pmData,
  currentOrganization,
  permissionLevels,
  selectedEquipmentId,
  pmLoading,
  isWorkOrderLocked,
  canAddNotes,
  canUpload,
  canAddCosts,
  canEditCosts,
  hideInlineNoteAddButton,
  shouldAutoOpenNoteForm,
  openNoteFormTrigger,
  teamData,
  assigneeData,
  pmSectionRef,
  notesSectionRef,
  stagger,
  onPMUpdate,
}: WorkOrderDetailsDesktopContentProps) {
  return (
    <>
      <div {...stagger(0)}>
        <WorkOrderDetailsInfo
          workOrder={workOrder}
          equipment={equipment}
          effectiveLocation={workOrder.effectiveLocation}
        />
      </div>

      {(permissionLevels.isManager || permissionLevels.isTechnician) && (
        <div {...stagger(1)}>
          <WorkOrderCostsSection
            workOrderId={workOrder.id}
            canAddCosts={canAddCosts && !isWorkOrderLocked}
            canEditCosts={canEditCosts && !isWorkOrderLocked}
            primaryEquipmentId={workOrder.equipment_id}
          />
        </div>
      )}

      {workOrder.has_pm && (permissionLevels.isManager || permissionLevels.isTechnician) && (
        <div ref={pmSectionRef}>
          {pmData && (
            <div {...stagger(2)}>
              <PMChecklistComponent
                key={selectedEquipmentId}
                pm={pmData}
                onUpdate={onPMUpdate}
                readOnly={isWorkOrderLocked || (!permissionLevels.isManager && !permissionLevels.isTechnician)}
                isAdmin={permissionLevels.isManager}
                workOrder={workOrder}
                equipment={equipment}
                team={teamData}
                organization={currentOrganization}
                assignee={assigneeData}
              />
            </div>
          )}

          {pmLoading && (
            <div {...stagger(2)}>
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
            </div>
          )}
        </div>
      )}

      <div {...stagger(3)}>
        <WorkOrderDetailsPMInfo
          workOrder={workOrder}
          pmData={pmData}
          permissionLevels={permissionLevels}
        />
      </div>

      <div {...stagger(4)}>
        <WorkOrderImagesSection
          workOrderId={workOrder.id}
          organizationId={workOrder.organization_id}
          canUpload={canUpload}
          showPrivateNotes={permissionLevels.isManager}
          primaryImageId={workOrder.primary_image_id}
        />
      </div>

      <div {...stagger(5)}>
        <div ref={notesSectionRef}>
          <WorkOrderNotesSection
            workOrderId={workOrder.id}
            canAddNotes={canAddNotes}
            showPrivateNotes={permissionLevels.isManager}
            hideInlineAddButton={hideInlineNoteAddButton}
            autoOpenForm={shouldAutoOpenNoteForm}
            openFormTrigger={openNoteFormTrigger}
          />
        </div>
      </div>

      <div {...stagger(6)}>
        <WorkOrderTimeline workOrder={workOrder} showDetailedHistory={permissionLevels.isManager} />
      </div>

      {permissionLevels.isManager && currentOrganization && (
        <div {...stagger(7)}>
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
        </div>
      )}
    </>
  );
}
