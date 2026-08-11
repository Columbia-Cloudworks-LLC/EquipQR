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
import { EquipmentMobilePMStatusBanner } from "./EquipmentMobilePMStatusBanner";
import { EquipmentBasicInfoCard } from "./EquipmentBasicInfoCard";
import { EquipmentLifecycleCard } from "./EquipmentLifecycleCard";
import { EquipmentMaintenanceNotesCard } from "./EquipmentMaintenanceNotesCard";
import { useEquipmentDetailsTabActions } from "@/features/equipment/hooks/useEquipmentDetailsTabActions";
import { EquipmentMediaSummaryStrip } from "@/features/equipment/components/media/EquipmentMediaSummaryStrip";
import { EquipmentMediaExplorer } from "@/features/equipment/components/media/EquipmentMediaExplorer";
import { useEquipmentMediaLibrary } from "@/features/equipment/hooks/useEquipmentMediaLibrary";
import { useEquipmentNotesPermissions } from "@/features/equipment/hooks/useEquipmentNotesPermissions";
import { updateEquipmentDisplayImage } from "@/features/equipment/services/equipmentImagesService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { equipment as equipmentKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { EquipmentPrimaryMediaPanel } from "@/features/equipment/components/media/EquipmentPrimaryMediaPanel";
import { getEquipmentViewTransitionStyle } from "@/features/equipment/transitions/equipmentViewTransitionNames";
import { useEquipmentCardTransitionState } from "@/features/equipment/transitions/useEquipmentCardTransitionState";

type Equipment = Tables<'equipment'>;

const WorkingHoursTimelineModal = lazy(() =>
  import("./WorkingHoursTimelineModal").then((module) => ({ default: module.WorkingHoursTimelineModal })),
);

interface EquipmentDetailsTabProps {
  equipment: Equipment;
  assignedTeam?: EquipmentTeamSummary | null;
}

const EquipmentDetailsTab: React.FC<EquipmentDetailsTabProps> = ({
  equipment,
  assignedTeam,
}) => {
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
  const [showAllBasicInfo, setShowAllBasicInfo] = useState(false);
  const [mediaExplorerOpen, setMediaExplorerOpen] = useState(false);
  const permissions = useUnifiedPermissions();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { activeEquipmentId } = useEquipmentCardTransitionState();
  const isTransitionActive = activeEquipmentId === equipment.id;
  const canAssignTeams = permissions.organization?.canManageMembers ?? false;
  const { data: fetchedTeams = [] } = useTeams(currentOrganization?.id, { enabled: canAssignTeams });
  const teams: EquipmentTeamSummary[] = fetchedTeams.length > 0
    ? fetchedTeams
    : assignedTeam
      ? [assignedTeam]
      : [];
  const equipmentPermissions = permissions.equipment.getPermissions(equipment.team_id || undefined);
  const organizationId = currentOrganization?.id;
  const canEdit = equipmentPermissions.canEdit && Boolean(organizationId);
  const updateEquipmentMutation = useUpdateEquipment(organizationId);
  const isMobile = useIsMobile();
  const { data: pmStatus } = useEquipmentPMStatus(equipment.id);
  const pmCompliance = getPMComplianceLevel(pmStatus);
  const notesPermissions = useEquipmentNotesPermissions(equipment.team_id || undefined);
  const media = useEquipmentMediaLibrary({
    equipmentId: equipment.id,
    organizationId,
    currentDisplayImage: equipment.image_url,
    enabled: Boolean(organizationId),
  });

  const setDisplayImageMutation = useMutation({
    mutationFn: (imageUrl: string) => {
      if (!organizationId) throw new Error('Organization ID required');
      return updateEquipmentDisplayImage(organizationId, equipment.id, imageUrl);
    },
    onSuccess: () => {
      if (!organizationId) return;
      queryClient.invalidateQueries({ queryKey: equipmentKeys.images(equipment.id) });
      queryClient.invalidateQueries({ queryKey: equipmentKeys.list(organizationId) });
      queryClient.invalidateQueries({ queryKey: equipmentKeys.byId(organizationId, equipment.id) });
      toast.success('Display image updated');
    },
    onError: () => toast.error('Failed to update display image'),
  });

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
    organizationId,
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

      {isMobile && organizationId ? (
        <div className="overflow-hidden rounded-lg border p-2">
          <EquipmentPrimaryMediaPanel
            equipmentId={equipment.id}
            organizationId={organizationId}
            equipmentName={equipment.name}
            currentDisplayImage={equipment.image_url}
            emptyClassName="h-48"
            mediaStyle={getEquipmentViewTransitionStyle('image', isTransitionActive)}
          />
        </div>
      ) : null}

      {organizationId ? (
        <EquipmentMediaSummaryStrip
          images={media.recentThumbnails}
          totalCount={media.images.length}
          equipmentName={equipment.name}
          isLoading={media.isLoading}
          onOpenExplorer={() => setMediaExplorerOpen(true)}
        />
      ) : null}

      <div className={isMobile ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-start'}>
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
      </div>

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

      {organizationId ? (
        <EquipmentMediaExplorer
          open={mediaExplorerOpen}
          onOpenChange={setMediaExplorerOpen}
          equipmentName={equipment.name}
          images={media.images}
          filteredImages={media.filteredImages}
          filters={media.filters}
          activeFilterCount={media.activeFilterCount}
          isLoading={media.isLoading}
          currentDisplayImage={equipment.image_url}
          canSetDisplayImage={notesPermissions.canSetDisplayImage}
          onSearchChange={media.setSearch}
          onSourceChange={media.setSource}
          onUploaderChange={media.setUploader}
          onDateFromChange={media.setDateFrom}
          onDateToChange={media.setDateTo}
          onSortChange={media.setSort}
          onClearFilters={media.clearFilters}
          onSetDisplayImage={async (imageUrl) => {
            await setDisplayImageMutation.mutateAsync(imageUrl);
          }}
        />
      ) : null}
    </div>
  );
};

export default EquipmentDetailsTab;
