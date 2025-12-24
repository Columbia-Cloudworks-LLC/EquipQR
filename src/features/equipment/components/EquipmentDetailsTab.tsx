import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Wrench, FileText, Settings, Users, Clock } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import QRCodeDisplay from "./QRCodeDisplay";
import InlineEditField from "./InlineEditField";
import InlineEditCustomAttributes from "./InlineEditCustomAttributes";
import { WorkingHoursTimelineModal } from "./WorkingHoursTimelineModal";
import { useUpdateEquipment } from "@/features/equipment/hooks/useEquipment";
import { useUnifiedPermissions } from "@/hooks/useUnifiedPermissions";
import { useTeams } from "@/features/teams/hooks/useTeamManagement";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePMTemplates } from "@/features/pm-templates/hooks/usePMTemplates";
import { toast } from "sonner";
import { logger } from '@/utils/logger';

type Equipment = Tables<'equipment'>;

interface EquipmentDetailsTabProps {
  equipment: Equipment;
}

const EquipmentDetailsTab: React.FC<EquipmentDetailsTabProps> = ({ equipment }) => {
  const [showQRCode, setShowQRCode] = React.useState(false);
  const [showWorkingHoursModal, setShowWorkingHoursModal] = React.useState(false);
  const permissions = useUnifiedPermissions();
  const { currentOrganization } = useOrganization();
  const { data: teams = [] } = useTeams(currentOrganization?.id);
  const { data: pmTemplates = [] } = usePMTemplates();
  const updateEquipmentMutation = useUpdateEquipment(currentOrganization?.id || '');

  // Check if user can edit equipment
  const equipmentPermissions = permissions.equipment.getPermissions(equipment.team_id || undefined);
  const canEdit = equipmentPermissions.canEdit;

  // Helper function to format date for HTML input
  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      logger.error('Error formatting date for input', error);
      return '';
    }
  };

  const handleFieldUpdate = async (field: keyof Equipment, value: string) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Updating equipment field`, { field: String(field), value });
      }
      await updateEquipmentMutation.mutateAsync({
        id: equipment.id,
        data: { [field]: value }
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

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'maintenance', label: 'Under Maintenance' },
    { value: 'inactive', label: 'Inactive' }
  ];

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
                    selectOptions={statusOptions}
                    className="text-base"
                  />
                ) : (
                  <Badge className={getStatusColor(equipment.status || 'active')}>
                    {statusOptions.find(opt => opt.value === equipment.status)?.label || 'Active'}
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
              <label className="text-sm font-medium text-gray-500">Location</label>
              <div className="mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <InlineEditField
                  value={equipment.location || ''}
                  onSave={(value) => handleFieldUpdate('location', value)}
                  canEdit={canEdit}
                  placeholder="Enter location"
                  className="text-base"
                />
              </div>
            </div>

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
