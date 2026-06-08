import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, Clock, ChevronDown, FileText, Users } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import InlineEditField from './InlineEditField';
import { EquipmentIdentityFields } from './EquipmentIdentityFields';
import { EquipmentLocationField } from './EquipmentLocationField';
import type { EquipmentTeamSummary } from '@/features/equipment/services/EquipmentService';
import { EQUIPMENT_STATUS_OPTIONS, getStatusColor } from '@/features/equipment/utils/equipmentHelpers';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';

type Equipment = Tables<'equipment'>;

function EquipmentDescriptionField({
  descriptionFieldId,
  value,
  canEdit,
  onSave,
}: {
  descriptionFieldId: string;
  value: string;
  canEdit: boolean;
  onSave: (value: string) => void | Promise<void>;
}) {
  return (
    <div>
      <label htmlFor={descriptionFieldId} className="text-sm font-medium text-muted-foreground">
        Description
      </label>
      <div className="mt-1">
        <InlineEditField
          value={value}
          onSave={onSave}
          canEdit={canEdit}
          fieldId={descriptionFieldId}
          type="textarea"
          placeholder="Enter equipment description"
          className="text-base"
          editAriaLabel="Edit description"
        />
      </div>
    </div>
  );
}

export type EquipmentBasicInfoCardProps = {
  equipment: Equipment;
  teams: EquipmentTeamSummary[];
  canEdit: boolean;
  canAssignTeams: boolean;
  isMobile: boolean;
  showAllBasicInfo: boolean;
  onShowAllBasicInfoChange: (open: boolean) => void;
  onShowWorkingHoursModal: () => void;
  isEditingLocation: boolean;
  isSavingLocation: boolean;
  isMapsLoaded: boolean;
  onStartLocationEdit: () => void;
  onCancelLocationEdit: () => void;
  onSaveLocation: (data: PlaceLocationData) => Promise<void>;
  nameFieldId: string;
  statusFieldId: string;
  manufacturerFieldId: string;
  modelFieldId: string;
  serialNumberFieldId: string;
  assignedTeamFieldId: string;
  pmTemplateFieldId: string;
  descriptionFieldId: string;
  teamOptions: { value: string; label: string }[];
  pmTemplateOptions: { value: string; label: string }[];
  lastMaintenanceLink: string | null;
  lastMaintenanceDisplay: string;
  onFieldUpdate: (field: keyof Equipment, value: string) => void | Promise<void>;
  onTeamAssignment: (value: string) => void | Promise<void>;
  onPMTemplateAssignment: (value: string) => void | Promise<void>;
  getCurrentTeamDisplay: () => string;
  getCurrentPMTemplateDisplay: () => string;
};

export function EquipmentBasicInfoCard({
  equipment,
  teams,
  canEdit,
  canAssignTeams,
  isMobile,
  showAllBasicInfo,
  onShowAllBasicInfoChange,
  onShowWorkingHoursModal,
  isEditingLocation,
  isSavingLocation,
  isMapsLoaded,
  onStartLocationEdit,
  onCancelLocationEdit,
  onSaveLocation,
  nameFieldId,
  statusFieldId,
  manufacturerFieldId,
  modelFieldId,
  serialNumberFieldId,
  assignedTeamFieldId,
  pmTemplateFieldId,
  descriptionFieldId,
  teamOptions,
  pmTemplateOptions,
  lastMaintenanceLink,
  lastMaintenanceDisplay,
  onFieldUpdate,
  onTeamAssignment,
  onPMTemplateAssignment,
  getCurrentTeamDisplay,
  getCurrentPMTemplateDisplay,
}: EquipmentBasicInfoCardProps) {
  return (
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
            <label htmlFor={nameFieldId} className="text-sm font-medium text-muted-foreground">Name</label>
            <div className="mt-1">
              <InlineEditField
                value={equipment.name || ''}
                onSave={(value) => onFieldUpdate('name', value)}
                canEdit={canEdit}
                fieldId={nameFieldId}
                placeholder="Enter equipment name"
                className="text-base"
                editAriaLabel="Edit name"
              />
            </div>
          </div>

          <div>
            <label htmlFor={statusFieldId} className="text-sm font-medium text-muted-foreground">Status</label>
            <div className="mt-1">
              {canEdit ? (
                <InlineEditField
                  value={equipment.status || 'active'}
                  onSave={(value) => onFieldUpdate('status', value)}
                  canEdit={canEdit}
                  fieldId={statusFieldId}
                  type="select"
                  selectOptions={[...EQUIPMENT_STATUS_OPTIONS]}
                  className="text-base"
                  editAriaLabel="Edit status"
                />
              ) : (
                <Badge className={`${getStatusColor(equipment.status || 'active')} rounded-full px-2 py-0.5 text-xs`} variant="outline">
                  {EQUIPMENT_STATUS_OPTIONS.find(opt => opt.value === equipment.status)?.label || 'Active'}
                </Badge>
              )}
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-muted-foreground">Working Hours</span>
            <div className="mt-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowWorkingHoursModal}
                className="min-h-11 justify-start px-2 text-left text-base font-normal hover:underline"
              >
                {equipment.working_hours ?? 0} hours
              </Button>
            </div>
          </div>

          <EquipmentLocationField
            equipment={equipment}
            teams={teams}
            canEdit={canEdit}
            isEditing={isEditingLocation}
            isSaving={isSavingLocation}
            isMapsLoaded={isMapsLoaded}
            onStartEdit={onStartLocationEdit}
            onCancelEdit={onCancelLocationEdit}
            onSave={onSaveLocation}
          />

          <div>
            <label htmlFor={assignedTeamFieldId} className="text-sm font-medium text-muted-foreground">Assigned Team</label>
            <div className="mt-1 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {canAssignTeams ? (
                <InlineEditField
                  value={equipment.team_id || 'unassigned'}
                  onSave={onTeamAssignment}
                  canEdit={canAssignTeams}
                  fieldId={assignedTeamFieldId}
                  type="select"
                  selectOptions={teamOptions}
                  placeholder="Select team"
                  className="text-base"
                  editAriaLabel="Edit assigned team"
                />
              ) : (
                <span className="text-base text-foreground">
                  {getCurrentTeamDisplay()}
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-muted-foreground">Last Maintenance</span>
            <div className="mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
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

          {!isMobile && (
            <EquipmentIdentityFields
              equipment={equipment}
              canEdit={canEdit}
              manufacturerFieldId={manufacturerFieldId}
              modelFieldId={modelFieldId}
              serialNumberFieldId={serialNumberFieldId}
              pmTemplateFieldId={pmTemplateFieldId}
              pmTemplateOptions={pmTemplateOptions}
              onFieldUpdate={onFieldUpdate}
              onPMTemplateAssignment={onPMTemplateAssignment}
              getCurrentPMTemplateDisplay={getCurrentPMTemplateDisplay}
            />
          )}
        </div>

        {!isMobile && (
          <EquipmentDescriptionField
            descriptionFieldId={descriptionFieldId}
            value={equipment.notes || ''}
            canEdit={canEdit}
            onSave={(value) => onFieldUpdate('notes', value)}
          />
        )}

        {isMobile && (
          <Collapsible open={showAllBasicInfo} onOpenChange={onShowAllBasicInfoChange}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-center gap-1.5 text-muted-foreground">
                <ChevronDown className={`h-4 w-4 transition-transform ${showAllBasicInfo ? 'rotate-180' : ''}`} />
                {showAllBasicInfo ? 'Show less' : 'Show all details'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 gap-4 pt-4 border-t mt-2">
                <EquipmentIdentityFields
                  equipment={equipment}
                  canEdit={canEdit}
                  manufacturerFieldId={manufacturerFieldId}
                  modelFieldId={modelFieldId}
                  serialNumberFieldId={serialNumberFieldId}
                  pmTemplateFieldId={pmTemplateFieldId}
                  pmTemplateOptions={pmTemplateOptions}
                  onFieldUpdate={onFieldUpdate}
                  onPMTemplateAssignment={onPMTemplateAssignment}
                  getCurrentPMTemplateDisplay={getCurrentPMTemplateDisplay}
                />

                <EquipmentDescriptionField
                  descriptionFieldId={descriptionFieldId}
                  value={equipment.notes || ''}
                  canEdit={canEdit}
                  onSave={(value) => onFieldUpdate('notes', value)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
