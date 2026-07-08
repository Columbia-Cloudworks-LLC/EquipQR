import React, { lazy, Suspense, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import InlineEditCustomAttributes from "./InlineEditCustomAttributes";
import { useUpdateEquipment } from "@/features/equipment/hooks/useEquipment";
import { useUnifiedPermissions } from "@/hooks/useUnifiedPermissions";
import type { EquipmentTeamSummary } from "@/features/equipment/services/EquipmentService";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useTeams } from "@/features/teams/hooks/useTeamManagement";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEquipmentPMStatus, getPMComplianceLevel } from "@/features/equipment/hooks/useEquipmentPMStatus";
import { logger } from '@/utils/logger';
import EquipmentPMInfo from "./EquipmentPMInfo";
import { EquipmentMobilePMStatusBanner } from "./EquipmentMobilePMStatusBanner";
import { EquipmentBasicInfoCard } from "./EquipmentBasicInfoCard";
import { EquipmentLifecycleCard } from "./EquipmentLifecycleCard";
import { EquipmentMaintenanceNotesCard } from "./EquipmentMaintenanceNotesCard";
import { useEquipmentDetailsTabActions } from "@/features/equipment/hooks/useEquipmentDetailsTabActions";
import { EquipmentOperatorCheckinConfig } from "@/features/operator-check-ins/components/EquipmentOperatorCheckinConfig";

type Equipment = Tables<'equipment'>;

const WorkingHoursTimelineModal = lazy(() =>
  import("./WorkingHoursTimelineModal").then((module) => ({ default: module.WorkingHoursTimelineModal })),
);

interface EquipmentDetailsTabProps {
  equipment: Equipment;
  assignedTeam?: EquipmentTeamSummary | null;
  onCreatePMWorkOrder?: () => void;
  isAdmin?: boolean;
  organizationId?: string;
  onOpenQrCodeForAssignment?: (assignmentId: string) => void;
}

const EquipmentDetailsTab: React.FC<EquipmentDetailsTabProps> = ({
  equipment,
  assignedTeam,
  onCreatePMWorkOrder,
  isAdmin = false,
  organizationId,
  onOpenQrCodeForAssignment,
}) => {
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
  const [showAllBasicInfo, setShowAllBasicInfo] = useState(false);
  const permissions = useUnifiedPermissions();
  const { currentOrganization } = useOrganization();
  const canAssignTeams = permissions.organization?.canManageMembers ?? false;
  const { data: fetchedTeams = [] } = useTeams(currentOrganization?.id, { enabled: canAssignTeams });
  const teams: EquipmentTeamSummary[] = fetchedTeams.length > 0
    ? fetchedTeams
    : assignedTeam
      ? [assignedTeam]
      : [];
  const equipmentPermissions = permissions.equipment.getPermissions(equipment.team_id || undefined);
  const canEdit = equipmentPermissions.canEdit;
  const updateEquipmentMutation = useUpdateEquipment(currentOrganization?.id || '');
  const isMobile = useIsMobile();
  const { data: pmStatus } = useEquipmentPMStatus(equipment.id);
  const pmCompliance = getPMComplianceLevel(pmStatus);
  const nameFieldId = `equipment-name-${equipment.id}`;
  const statusFieldId = `equipment-status-${equipment.id}`;
  const manufacturerFieldId = `equipment-manufacturer-${equipment.id}`;
  const modelFieldId = `equipment-model-${equipment.id}`;
  const serialNumberFieldId = `equipment-serial-number-${equipment.id}`;
  const assignedTeamFieldId = `equipment-assigned-team-${equipment.id}`;
  const descriptionFieldId = `equipment-description-${equipment.id}`;
  const installationDateFieldId = `equipment-installation-date-${equipment.id}`;
  const warrantyExpirationFieldId = `equipment-warranty-expiration-${equipment.id}`;
  const maintenanceDateFieldId = `equipment-maintenance-date-${equipment.id}`;
  const notesFieldId = `equipment-notes-${equipment.id}`;

  const {
    handleFieldUpdate,
    handleCustomAttributesUpdate,
    handleTeamAssignment,
    teamOptions,
    getCurrentTeamDisplay,
  } = useEquipmentDetailsTabActions({
    equipment,
    organizationId: currentOrganization?.id || '',
    teams,
    updateEquipmentMutation,
  });

  const lastMaintenanceLink = equipment.last_maintenance_work_order_id && equipment.last_maintenance
    ? `/dashboard/work-orders/${equipment.last_maintenance_work_order_id}`
    : null;

  const lastMaintenanceDisplay = equipment.last_maintenance
    ? format(new Date(equipment.last_maintenance), 'PPP')
    : '—';

  if (import.meta.env.DEV) {
    logger.debug('Equipment data snapshot', {
      serial_number: equipment.serial_number,
      installation_date: equipment.installation_date,
      warranty_expiration: equipment.warranty_expiration,
      last_maintenance: equipment.last_maintenance,
      custom_attributes: equipment.custom_attributes
    });
  }

  return (
    <div className="space-y-6">
      {isMobile && pmStatus && (
        <EquipmentMobilePMStatusBanner
          equipment={equipment}
          pmStatus={pmStatus}
          pmCompliance={pmCompliance}
        />
      )}

      <EquipmentBasicInfoCard
        equipment={equipment}
        canEdit={canEdit}
        canAssignTeams={canAssignTeams}
        isMobile={isMobile}
        showAllBasicInfo={showAllBasicInfo}
        onShowAllBasicInfoChange={setShowAllBasicInfo}
        onShowWorkingHoursModal={() => setShowWorkingHoursModal(true)}
        nameFieldId={nameFieldId}
        statusFieldId={statusFieldId}
        manufacturerFieldId={manufacturerFieldId}
        modelFieldId={modelFieldId}
        serialNumberFieldId={serialNumberFieldId}
        assignedTeamFieldId={assignedTeamFieldId}
        descriptionFieldId={descriptionFieldId}
        teamOptions={teamOptions}
        lastMaintenanceLink={lastMaintenanceLink}
        lastMaintenanceDisplay={lastMaintenanceDisplay}
        onFieldUpdate={handleFieldUpdate}
        onTeamAssignment={handleTeamAssignment}
        getCurrentTeamDisplay={getCurrentTeamDisplay}
      />

      {isMobile && (
        <EquipmentPMInfo
          equipment={equipment}
          canEdit={canEdit}
          getCurrentTeamDisplay={getCurrentTeamDisplay}
          onCreatePMWorkOrder={onCreatePMWorkOrder}
        />
      )}

      <EquipmentLifecycleCard
        equipment={equipment}
        canEdit={canEdit}
        installationDateFieldId={installationDateFieldId}
        warrantyExpirationFieldId={warrantyExpirationFieldId}
        maintenanceDateFieldId={maintenanceDateFieldId}
        lastMaintenanceLink={lastMaintenanceLink}
        lastMaintenanceDisplay={lastMaintenanceDisplay}
        onFieldUpdate={handleFieldUpdate}
      />

      {!isMobile && (
        <EquipmentPMInfo
          equipment={equipment}
          canEdit={canEdit}
          getCurrentTeamDisplay={getCurrentTeamDisplay}
          onCreatePMWorkOrder={onCreatePMWorkOrder}
        />
      )}

      {isAdmin && organizationId && onOpenQrCodeForAssignment && (
        <EquipmentOperatorCheckinConfig
          organizationId={organizationId}
          equipmentId={equipment.id}
          equipmentName={equipment.name}
          onOpenQrCodeForAssignment={onOpenQrCodeForAssignment}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Custom Attributes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InlineEditCustomAttributes
            value={equipment.custom_attributes as Record<string, string> || {}}
            onSave={handleCustomAttributesUpdate}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>

      <EquipmentMaintenanceNotesCard
        equipment={equipment}
        canEdit={canEdit}
        notesFieldId={notesFieldId}
        onFieldUpdate={handleFieldUpdate}
      />

      {showWorkingHoursModal && (
        <Suspense fallback={null}>
          <WorkingHoursTimelineModal
            open={showWorkingHoursModal}
            onClose={() => setShowWorkingHoursModal(false)}
            equipmentId={equipment.id}
            equipmentName={equipment.name || 'Unknown Equipment'}
          />
        </Suspense>
      )}
    </div>
  );
};

export default EquipmentDetailsTab;
