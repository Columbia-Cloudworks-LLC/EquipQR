import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, MapPin, Wrench, FileText, Settings, Users, Clock, Edit2, Info, Navigation, X, Check } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import QRCodeDisplay from "./QRCodeDisplay";
import InlineEditField from "./InlineEditField";
import InlineEditCustomAttributes from "./InlineEditCustomAttributes";
import { WorkingHoursTimelineModal } from "./WorkingHoursTimelineModal";
import ClickableAddress from "@/components/ui/ClickableAddress";
import GooglePlacesAutocomplete, { type PlaceLocationData } from "@/components/ui/GooglePlacesAutocomplete";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";
import { useUpdateEquipment } from "@/features/equipment/hooks/useEquipment";
import { useUnifiedPermissions } from "@/hooks/useUnifiedPermissions";
import { useTeams } from "@/features/teams/hooks/useTeamManagement";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePMTemplates } from "@/features/pm-templates/hooks/usePMTemplates";
import { toast } from "sonner";
import { logger } from '@/utils/logger';
import { 
  formatDateForInput, 
  getStatusColor, 
  EQUIPMENT_STATUS_OPTIONS 
} from "@/features/equipment/utils/equipmentHelpers";
import { applyEquipmentUpdateRules } from "@/utils/object-utils";

type Equipment = Tables<'equipment'>;

interface EquipmentDetailsTabProps {
  equipment: Equipment;
}

// ── Consolidated Location Field ──────────────────────────────────────

interface EquipmentLocationFieldProps {
  equipment: Equipment;
  teams: Array<{ id: string; name: string; location_address?: string; location_city?: string; location_state?: string; location_country?: string; location_lat?: number; location_lng?: number; override_equipment_location?: boolean }>;
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  isMapsLoaded: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: PlaceLocationData) => Promise<void>;
}

function buildAddressString(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string {
  return [parts.street, parts.city, parts.state, parts.country]
    .filter(Boolean)
    .join(', ');
}

const EquipmentLocationField: React.FC<EquipmentLocationFieldProps> = ({
  equipment,
  teams,
  canEdit,
  isEditing,
  isSaving,
  isMapsLoaded,
  onStartEdit,
  onCancelEdit,
  onSave,
}) => {
  const [pendingPlace, setPendingPlace] = useState<PlaceLocationData | null>(null);
  const [isCleared, setIsCleared] = useState(false);

  // Resolve team override
  const team = equipment.team_id
    ? teams.find((t) => t.id === equipment.team_id)
    : undefined;
  const isTeamOverride =
    !!equipment.use_team_location &&
    !!team?.override_equipment_location &&
    team.location_lat != null &&
    team.location_lng != null;

  // Build addresses
  const teamAddress = team
    ? buildAddressString({
        street: team.location_address,
        city: team.location_city,
        state: team.location_state,
        country: team.location_country,
      })
    : '';

  const equipmentAddress = buildAddressString({
    street: equipment.assigned_location_street,
    city: equipment.assigned_location_city,
    state: equipment.assigned_location_state,
    country: equipment.assigned_location_country,
  });

  const handlePlaceSelect = useCallback((data: PlaceLocationData) => {
    setPendingPlace(data);
    setIsCleared(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (isCleared) {
      // Save with null location fields to clear the assigned address
      await onSave({
        formatted_address: '',
        street: '',
        city: '',
        state: '',
        country: '',
        lat: undefined,
        lng: undefined,
      } as PlaceLocationData);
      setPendingPlace(null);
      setIsCleared(false);
    } else if (pendingPlace) {
      await onSave(pendingPlace);
      setPendingPlace(null);
    }
  }, [pendingPlace, isCleared, onSave]);

  const handleCancel = useCallback(() => {
    setPendingPlace(null);
    setIsCleared(false);
    onCancelEdit();
  }, [onCancelEdit]);

  // ── Team Override: show team address, no editing ──
  if (isTeamOverride) {
    return (
      <div>
        <label className="text-sm font-medium text-gray-500">Location</label>
        <div className="mt-1 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <ClickableAddress
            address={teamAddress || undefined}
            lat={team!.location_lat}
            lng={team!.location_lng}
            className="text-base"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                <p>This location is set by the team. Edit the team to change it.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mt-1 ml-6">
          <Link
            to={`/dashboard/teams/${team!.id}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Navigation className="h-3 w-3" />
            Set by {team!.name}
          </Link>
        </div>
      </div>
    );
  }

  // ── Editing mode: show GooglePlacesAutocomplete ──
  if (isEditing) {
    return (
      <div>
        <label className="text-sm font-medium text-gray-500">Location</label>
        <div className="mt-1 space-y-2">
          <GooglePlacesAutocomplete
            value={isCleared ? '' : (pendingPlace?.formatted_address ?? equipmentAddress)}
            onPlaceSelect={handlePlaceSelect}
            onClear={() => {
              setPendingPlace(null);
              setIsCleared(true);
            }}
            placeholder="Search for an address..."
            isLoaded={isMapsLoaded}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleSave}
              disabled={(!pendingPlace && !isCleared) || isSaving}
              className="gap-1 h-7 text-xs"
            >
              <Check className="h-3 w-3" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
              className="gap-1 h-7 text-xs"
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Has equipment address: show it with edit button ──
  if (equipmentAddress) {
    return (
      <div>
        <label className="text-sm font-medium text-gray-500">Location</label>
        <div className="mt-1 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <ClickableAddress
            address={equipmentAddress}
            lat={equipment.assigned_location_lat ?? undefined}
            lng={equipment.assigned_location_lng ?? undefined}
            className="text-base"
          />
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartEdit}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Edit location"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── No location: empty state ──
  return (
    <div>
      <label className="text-sm font-medium text-gray-500">Location</label>
      <div className="mt-1 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="text-base text-muted-foreground">No location set</span>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartEdit}
            className="h-auto p-0 text-xs text-primary hover:text-primary/80 hover:underline"
          >
            Set Location
          </Button>
        )}
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────

const EquipmentDetailsTab: React.FC<EquipmentDetailsTabProps> = ({ equipment }) => {
  const [showQRCode, setShowQRCode] = useState(false);
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const { isLoaded: isMapsLoaded } = useGoogleMapsLoader();
  const permissions = useUnifiedPermissions();
  const { currentOrganization } = useOrganization();
  const { data: teams = [] } = useTeams(currentOrganization?.id);
  const { data: pmTemplates = [] } = usePMTemplates();
  const updateEquipmentMutation = useUpdateEquipment(currentOrganization?.id || '');

  // Check if user can edit equipment
  const equipmentPermissions = permissions.equipment.getPermissions(equipment.team_id || undefined);
  const canEdit = equipmentPermissions.canEdit;

  const handleFieldUpdate = async (field: keyof Equipment, value: string) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Updating equipment field`, { field: String(field), value });
      }
      // Apply business rules (e.g., clearing work order ID when last_maintenance changes)
      const updateData = applyEquipmentUpdateRules({ [field]: value } as Partial<Equipment>);
      await updateEquipmentMutation.mutateAsync({
        id: equipment.id,
        data: updateData
      });
      toast.success(`${String(field)} updated successfully`);
    } catch (error) {
      logger.error(`Error updating ${String(field)}`, error);
      toast.error(`Failed to update ${String(field)}`);
      throw error; // Re-throw to let InlineEditField handle the error state
    }
  };

  const handleCustomAttributesUpdate = async (newAttributes: Record<string, string>) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Updating custom attributes', { newAttributes });
      }
      await updateEquipmentMutation.mutateAsync({
        id: equipment.id,
        data: { custom_attributes: newAttributes }
      });
      toast.success('Custom attributes updated successfully');
    } catch (error) {
      logger.error('Error updating custom attributes', error);
      toast.error('Failed to update custom attributes');
      throw error;
    }
  };

  const lastMaintenanceLink = equipment.last_maintenance_work_order_id && equipment.last_maintenance
    ? `/dashboard/work-orders/${equipment.last_maintenance_work_order_id}`
    : null;

  const lastMaintenanceDisplay = equipment.last_maintenance
    ? format(new Date(equipment.last_maintenance), 'PPP')
    : 'Not set';

  // Handle team assignment
  const handleTeamAssignment = async (teamId: string) => {
    try {
      const teamValue = teamId === 'unassigned' ? null : teamId;
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Updating team assignment', { teamValue });
      }
      await updateEquipmentMutation.mutateAsync({
        id: equipment.id,
        data: { team_id: teamValue }
      });
      toast.success('Team assignment updated successfully');
    } catch (error) {
      logger.error('Error updating team assignment', error);
      toast.error('Failed to update team assignment');
      throw error;
    }
  };

  // Prepare team options for the select
  const teamOptions = [
    { value: 'unassigned', label: 'Unassigned' },
    ...teams.map(team => ({ value: team.id, label: team.name }))
  ];

  // Prepare PM template options for the select
  const pmTemplateOptions = [
    { value: 'none', label: 'None' },
    ...pmTemplates.map(template => ({ value: template.id, label: template.name }))
  ];

  // Handle PM template assignment
  const handlePMTemplateAssignment = async (templateId: string) => {
    try {
      const templateValue = templateId === 'none' ? null : templateId;
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Updating PM template assignment', { templateValue });
      }
      await updateEquipmentMutation.mutateAsync({
        id: equipment.id,
        data: { default_pm_template_id: templateValue }
      });
      toast.success('PM template assignment updated successfully');
    } catch (error) {
      logger.error('Error updating PM template assignment', error);
      toast.error('Failed to update PM template assignment');
      throw error;
    }
  };

  // Get current PM template name for display
  const getCurrentPMTemplateDisplay = () => {
    if (!equipment.default_pm_template_id) return 'None';
    const template = pmTemplates.find(t => t.id === equipment.default_pm_template_id);
    return template?.name || 'Unknown Template';
  };

  // Get current team name for display
  const getCurrentTeamDisplay = () => {
    if (!equipment.team_id) return 'Unassigned';
    const team = teams.find(t => t.id === equipment.team_id);
    return team?.name || 'Unknown Team';
  };

  // Can assign teams (only admins/owners)
  const canAssignTeams = permissions.organization?.canManageMembers ?? false;

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
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
      {/* Basic Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <div className="mt-1">
                <InlineEditField
                  value={equipment.name || ''}
                  onSave={(value) => handleFieldUpdate('name', value)}
                  canEdit={canEdit}
                  placeholder="Enter equipment name"
                  className="text-base"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                {canEdit ? (
                  <InlineEditField
                    value={equipment.status || 'active'}
                    onSave={(value) => handleFieldUpdate('status', value)}
                    canEdit={canEdit}
                    type="select"
                    selectOptions={[...EQUIPMENT_STATUS_OPTIONS]}
                    className="text-base"
                  />
                ) : (
                  <Badge className={getStatusColor(equipment.status || 'active')}>
                    {EQUIPMENT_STATUS_OPTIONS.find(opt => opt.value === equipment.status)?.label || 'Active'}
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Manufacturer</label>
              <div className="mt-1">
                <InlineEditField
                  value={equipment.manufacturer || ''}
                  onSave={(value) => handleFieldUpdate('manufacturer', value)}
                  canEdit={canEdit}
                  placeholder="Enter manufacturer"
                  className="text-base"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Model</label>
              <div className="mt-1">
                <InlineEditField
                  value={equipment.model || ''}
                  onSave={(value) => handleFieldUpdate('model', value)}
                  canEdit={canEdit}
                  placeholder="Enter model"
                  className="text-base"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Serial Number</label>
              <div className="mt-1">
                <InlineEditField
                  value={equipment.serial_number || ''}
                  onSave={(value) => handleFieldUpdate('serial_number', value)}
                  canEdit={canEdit}
                  placeholder="Enter serial number"
                  className="text-base"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Working Hours</label>
              <div className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowWorkingHoursModal(true)}
                  className="h-auto p-0 font-normal text-base text-left justify-start hover:underline"
                >
                  {equipment.working_hours ?? 0} hours
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Last Maintenance</label>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {lastMaintenanceLink ? (
                  <Link
                    to={lastMaintenanceLink}
                    className="text-base text-primary hover:underline"
                  >
                    {lastMaintenanceDisplay}
                  </Link>
                ) : (
                  <span className="text-base">{lastMaintenanceDisplay}</span>
                )}
              </div>
            </div>

            <EquipmentLocationField
              equipment={equipment}
              teams={teams}
              canEdit={canEdit}
              isEditing={isEditingLocation}
              isSaving={isSavingLocation}
              isMapsLoaded={isMapsLoaded}
              onStartEdit={() => setIsEditingLocation(true)}
              onCancelEdit={() => setIsEditingLocation(false)}
              onSave={async (data) => {
                setIsSavingLocation(true);
                try {
                  await updateEquipmentMutation.mutateAsync({
                    id: equipment.id,
                    data: {
                      assigned_location_street: data.street || null,
                      assigned_location_city: data.city || null,
                      assigned_location_state: data.state || null,
                      assigned_location_country: data.country || null,
                      assigned_location_lat: data.lat,
                      assigned_location_lng: data.lng,
                    },
                  });
                  toast.success('Location updated successfully');
                  setIsEditingLocation(false);
                } catch (error) {
                  logger.error('Error updating location', error);
                  toast.error('Failed to update location');
                } finally {
                  setIsSavingLocation(false);
                }
              }}
            />

            <div>
              <label className="text-sm font-medium text-gray-500">Assigned Team</label>
              <div className="mt-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                {canAssignTeams ? (
                  <InlineEditField
                    value={equipment.team_id || 'unassigned'}
                    onSave={handleTeamAssignment}
                    canEdit={canAssignTeams}
                    type="select"
                    selectOptions={teamOptions}
                    placeholder="Select team"
                    className="text-base"
                  />
                ) : (
                  <span className="text-base text-gray-900">
                    {getCurrentTeamDisplay()}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">PM Template</label>
              <div className="mt-1 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-gray-400" />
                {canEdit ? (
                  <InlineEditField
                    value={equipment.default_pm_template_id || 'none'}
                    onSave={handlePMTemplateAssignment}
                    canEdit={canEdit}
                    type="select"
                    selectOptions={pmTemplateOptions}
                    placeholder="Select PM template"
                    className="text-base"
                  />
                ) : (
                  <span className="text-base text-gray-900">
                    {getCurrentPMTemplateDisplay()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Description</label>
            <div className="mt-1">
              <InlineEditField
                value={equipment.notes || ''}
                onSave={(value) => handleFieldUpdate('notes', value)}
                canEdit={canEdit}
                type="textarea"
                placeholder="Enter equipment description"
                className="text-base"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Installation Date</label>
              <div className="mt-1">
                <InlineEditField
                  value={formatDateForInput(equipment.installation_date)}
                  onSave={(value) => handleFieldUpdate('installation_date', value)}
                  canEdit={canEdit}
                  type="date"
                  placeholder="Select installation date"
                  className="text-base"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Warranty Expiration</label>
              <div className="mt-1">
                <InlineEditField
                  value={formatDateForInput(equipment.warranty_expiration)}
                  onSave={(value) => handleFieldUpdate('warranty_expiration', value)}
                  canEdit={canEdit}
                  type="date"
                  placeholder="Select warranty expiration date"
                  className="text-base"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Last Maintenance</label>
              <div className="mt-1">
                <InlineEditField
                  value={formatDateForInput(equipment.last_maintenance)}
                  onSave={(value) => handleFieldUpdate('last_maintenance', value)}
                  canEdit={canEdit}
                  type="date"
                  placeholder="Select last maintenance date"
                  className="text-base"
                  displayNode={
                    lastMaintenanceLink ? (
                      <Link
                        to={lastMaintenanceLink}
                        className="text-primary hover:underline"
                        aria-label="View work order for last maintenance"
                      >
                        {lastMaintenanceDisplay}
                      </Link>
                    ) : undefined
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created Date</label>
              <div className="mt-1 text-base text-gray-900">
                {equipment.created_at ? format(new Date(equipment.created_at), 'PPP') : 'Not set'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Attributes Card */}
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

      {/* Maintenance Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Notes</label>
            <div className="mt-1">
              <InlineEditField
                value={equipment.notes || ''}
                onSave={(value) => handleFieldUpdate('notes', value)}
                canEdit={canEdit}
                type="textarea"
                placeholder="Enter maintenance notes or additional information"
                className="text-base"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      <QRCodeDisplay
        open={showQRCode}
        onClose={() => setShowQRCode(false)}
        equipmentId={equipment.id}
        equipmentName={equipment.name}
      />

      {/* Working Hours Timeline Modal */}
      <WorkingHoursTimelineModal
        open={showWorkingHoursModal}
        onClose={() => setShowWorkingHoursModal(false)}
        equipmentId={equipment.id}
        equipmentName={equipment.name || 'Unknown Equipment'}
      />
    </div>
  );
};

export default EquipmentDetailsTab;
