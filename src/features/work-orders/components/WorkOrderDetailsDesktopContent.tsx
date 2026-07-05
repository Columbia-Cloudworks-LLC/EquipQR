import React from 'react';
import WorkOrderDetailsInfo from '@/features/work-orders/components/WorkOrderDetailsInfo';
import { WorkOrderHistoricalTimelineSection } from '@/features/work-orders/components/WorkOrderHistoricalTimelineSection';
import WorkOrderNotesSection from '@/features/work-orders/components/WorkOrderNotesSection';
import WorkOrderImagesSection from '@/features/work-orders/components/WorkOrderImagesSection';
import PMChecklistComponent from '@/features/work-orders/components/PMChecklistComponent';
import WorkOrderCostsSection from '@/features/work-orders/components/WorkOrderCostsSection';
import { WorkOrderDetailsPMInfo } from '@/features/work-orders/components/WorkOrderDetailsPMInfo';
import {
  WorkOrderFieldChangeHistoryCard,
  WorkOrderPMChecklistLoadingCard,
} from '@/features/work-orders/components/WorkOrderDetailsSharedCards';
import { WorkOrderPMManagementActions } from '@/features/work-orders/components/WorkOrderPMManagementActions';
import type { EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import type { EquipmentLocationEditProps } from '@/components/location/equipmentLocationEditProps';
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
  currentOrganization: { id: string; name: string; scanLocationCollectionEnabled?: boolean };
  permissionLevels: {
    isManager: boolean;
    isTechnician: boolean;
  };
  selectedEquipmentId: string;
  pmLoading: boolean;
  isWorkOrderLocked: boolean;
  canAddNotes: boolean;
  canUsePrivateNotes: boolean;
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
  canEditInlineFields?: boolean;
  onSaveDescription?: (description: string) => Promise<void>;
  equipmentLocationEdit?: EquipmentLocationEditProps;
  canManagePM?: boolean;
  onManagePM?: () => void;
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
  canUsePrivateNotes,
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
  canEditInlineFields = false,
  onSaveDescription,
  equipmentLocationEdit,
  canManagePM = false,
  onManagePM,
}: WorkOrderDetailsDesktopContentProps) {
  return (
    <>
      <div {...stagger(0)}>
        <WorkOrderDetailsInfo
          workOrder={workOrder}
          equipment={equipment ?? null}
          organizationId={currentOrganization.id}
          scanLocationCollectionEnabled={currentOrganization.scanLocationCollectionEnabled}
          canEditDescription={canEditInlineFields}
          onSaveDescription={onSaveDescription}
          equipmentLocationEdit={equipmentLocationEdit}
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

      <WorkOrderPMManagementActions
        canManage={canManagePM}
        hasPm={workOrder.has_pm}
        onManage={() => onManagePM?.()}
        className="mb-2"
      />

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
              <WorkOrderPMChecklistLoadingCard />
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
          showPrivateNotes={canUsePrivateNotes}
          primaryImageId={workOrder.primary_image_id}
        />
      </div>

      <div {...stagger(5)}>
        <div
          ref={notesSectionRef}
          className="space-y-4 xl:grid xl:grid-cols-2 xl:items-start xl:gap-4 xl:space-y-0"
        >
          <WorkOrderNotesSection
            workOrderId={workOrder.id}
            canAddNotes={canAddNotes}
            showPrivateNotes={canUsePrivateNotes}
            isHistorical={Boolean(workOrder.is_historical)}
            canEditNoteTimestamps={permissionLevels.isManager}
            hideInlineAddButton={hideInlineNoteAddButton}
            autoOpenForm={shouldAutoOpenNoteForm}
            openFormTrigger={openNoteFormTrigger}
          />

          <div className="space-y-4">
            <WorkOrderHistoricalTimelineSection
              workOrder={workOrder}
              showDetailedHistory={permissionLevels.isManager}
              canEditTimeline={permissionLevels.isManager}
            />

            {permissionLevels.isManager && currentOrganization ? (
              <WorkOrderFieldChangeHistoryCard
                workOrderId={workOrder.id}
                organizationId={currentOrganization.id}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
