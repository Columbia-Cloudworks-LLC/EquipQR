// fallow-ignore-file code-duplication
// Duplication rationale: Metadata editor mirrors create dialog field styling

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { TeamLocationFormFields } from '@/features/teams/components/TeamLocationFormFields';
import { TeamWithMembers, updateTeam, uploadTeamImage, deleteTeamImage } from '@/features/teams/services/teamService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { type PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { TEAM_NATIVE_SELECT_CLASS_NAME } from '@/features/teams/constants/teamNativeSelectClassName';
import SingleImageUpload from '@/components/common/SingleImageUpload';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useCustomersByOrg } from '@/features/teams/hooks/useCustomerAccount';
import { PMSchedulePolicyFields } from '@/features/pm-templates/components/PMSchedulePolicyFields';
import {
  policyRowToFormState,
  type PMSchedulePolicyFormState,
} from '@/features/pm-templates/services/pmIntervalPolicyService';
import { usePMIntervalPolicy } from '@/features/pm-templates/hooks/usePMIntervalPolicies';
import { pmIntervalPolicyService } from '@/features/pm-templates/services/pmIntervalPolicyService';

interface TeamMetadataEditorProps {
  open: boolean;
  onClose: () => void;
  team: TeamWithMembers;
}

/**
 * Build a display string from existing team location fields.
 */
function buildTeamAddressDisplay(team: TeamWithMembers): string {
  const parts = [
    team.location_address,
    team.location_city,
    team.location_state,
    team.location_country,
  ].filter(Boolean);
  return parts.join(', ');
}

const DESCRIPTION_MAX_LENGTH = 500;

const TeamMetadataEditor: React.FC<TeamMetadataEditorProps> = ({ 
  open, 
  onClose, 
  team 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [descriptionLength, setDescriptionLength] = useState(team.description?.length ?? 0);
  const [locationData, setLocationData] = useState<PlaceLocationData | null>(null);
  const [locationCleared, setLocationCleared] = useState(false);
  const [overrideEquipmentLocation, setOverrideEquipmentLocation] = useState(
    team.override_equipment_location ?? false
  );
  const [currentTeamImage, setCurrentTeamImage] = useState<string | null>(
    (team as { image_url?: string | null }).image_url ?? null
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    team.customer_id ?? null
  );
  const queryClient = useQueryClient();
  const { isLoaded } = useGoogleMapsLoader();
  const { currentOrganization } = useOrganization();
  const { canManageTeam } = usePermissions();
  const canEditTeam = canManageTeam(team.id);
  const { data: orgCustomers } = useCustomersByOrg(open ? currentOrganization?.id : undefined);
  const teamPolicyTarget = { scopeType: 'team' as const, teamId: team.id };
  const { data: teamPolicy } = usePMIntervalPolicy(currentOrganization?.id, teamPolicyTarget, { enabled: open });
  const [pmScheduleForm, setPmScheduleForm] = useState<PMSchedulePolicyFormState>(
    policyRowToFormState(teamPolicy)
  );
  const [pmScheduleError, setPmScheduleError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setPmScheduleForm(policyRowToFormState(teamPolicy));
    }
  }, [open, teamPolicy]);

  const handleTeamImageUpload = async (file: File) => {
    const publicUrl = await uploadTeamImage(team.id, team.organization_id, file);
    setCurrentTeamImage(publicUrl);
    queryClient.invalidateQueries({ queryKey: ['team', team.id] });
    queryClient.invalidateQueries({ queryKey: ['teams', team.organization_id] });
  };

  const handleTeamImageDelete = async () => {
    if (!currentTeamImage) return;
    await deleteTeamImage(team.id, team.organization_id, currentTeamImage);
    setCurrentTeamImage(null);
    queryClient.invalidateQueries({ queryKey: ['team', team.id] });
    queryClient.invalidateQueries({ queryKey: ['teams', team.organization_id] });
  };

  const existingAddress = buildTeamAddressDisplay(team);

  const handlePlaceSelect = useCallback((data: PlaceLocationData) => {
    setLocationData(data);
    setLocationCleared(false);
  }, []);

  const handleLocationClear = useCallback(() => {
    setLocationData(null);
    setLocationCleared(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEditTeam) {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to edit this team.',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    
    const updates: Record<string, unknown> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      override_equipment_location: overrideEquipmentLocation,
      customer_id: selectedCustomerId,
    };

    // If user selected a new place, use that data
    if (locationData) {
      updates.location_address = locationData.street || null;
      updates.location_city = locationData.city || null;
      updates.location_state = locationData.state || null;
      updates.location_country = locationData.country || null;
      updates.location_lat = locationData.lat;
      updates.location_lng = locationData.lng;
    } else if (locationCleared) {
      // User explicitly cleared the location
      updates.location_address = null;
      updates.location_city = null;
      updates.location_state = null;
      updates.location_country = null;
      updates.location_lat = null;
      updates.location_lng = null;
    }

    if (pmScheduleForm.mode === 'custom' && (!pmScheduleForm.intervalValue || pmScheduleForm.intervalValue < 1)) {
      setPmScheduleError('Enter a value of 1 or greater');
      return;
    }
    setPmScheduleError(null);

    setIsLoading(true);
    try {
      await updateTeam(team.id, updates);

      queryClient.invalidateQueries({ queryKey: ['team', team.id] });
      queryClient.invalidateQueries({ queryKey: ['teams', team.organization_id] });

      let pmScheduleSaved = true;
      if (currentOrganization?.id) {
        try {
          await pmIntervalPolicyService.upsertPolicy(
            currentOrganization.id,
            teamPolicyTarget,
            pmScheduleForm
          );
          queryClient.invalidateQueries({
            queryKey: ['pm-interval-policies', currentOrganization.id, 'team', team.id],
          });
          queryClient.invalidateQueries({
            queryKey: ['pm-status', 'org', currentOrganization.id],
          });
          queryClient.invalidateQueries({
            queryKey: ['pm-interval-policies', 'effective'],
          });
        } catch (policyError) {
          pmScheduleSaved = false;
          toast({
            title: 'Team updated, but PM schedule was not saved',
            description:
              policyError instanceof Error
                ? policyError.message
                : 'Failed to save PM schedule. Please try again.',
            variant: 'destructive',
          });
        }
      }

      if (pmScheduleSaved) {
        toast({
          title: 'Team updated',
          description: 'Team information has been successfully updated.',
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Error updating team',
        description: error instanceof Error ? error.message : 'Failed to update team. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Team Information</DialogTitle>
          <DialogDescription>
            Update the team's basic information and location
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={team.name}
                  placeholder="e.g., Maintenance Team"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={team.description ?? ''}
                  onChange={(e) => setDescriptionLength(e.target.value.length)}
                  placeholder="Brief description of the team's responsibilities..."
                  className="min-h-[100px]"
                  maxLength={DESCRIPTION_MAX_LENGTH}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {descriptionLength} / {DESCRIPTION_MAX_LENGTH}
                </p>
              </div>

              <SingleImageUpload
                currentImageUrl={currentTeamImage}
                onUpload={handleTeamImageUpload}
                onDelete={handleTeamImageDelete}
                maxSizeMB={5}
                disabled={isLoading}
                label="Team Image"
                helpText="Upload a logo or photo to identify this team"
              />

              {/* Customer Account */}
              <div className="space-y-2">
                <Label htmlFor="edit-customer-account-select">Customer Account</Label>
                <select
                  id="edit-customer-account-select"
                  className={TEAM_NATIVE_SELECT_CLASS_NAME}
                  value={selectedCustomerId ?? ''}
                  onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                >
                  <option value="">None (no account)</option>
                  {(orgCustomers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <TeamLocationFormFields
                locationAddress={locationData?.formatted_address ?? existingAddress}
                onPlaceSelect={handlePlaceSelect}
                onClear={handleLocationClear}
                isLoaded={isLoaded}
                overrideEquipmentLocation={overrideEquipmentLocation}
                onOverrideEquipmentLocationChange={setOverrideEquipmentLocation}
              />

              <PMSchedulePolicyFields
                value={pmScheduleForm}
                onChange={setPmScheduleForm}
                inheritLabel="Inherit from assigned PM template"
                intervalError={pmScheduleError}
                disabled={isLoading}
              />
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !canEditTeam}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMetadataEditor;
