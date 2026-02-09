
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from 'lucide-react';
import { TeamWithMembers } from '@/features/teams/services/teamService';
import { updateTeam } from '@/features/teams/services/teamService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import GooglePlacesAutocomplete, { type PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';

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

const TeamMetadataEditor: React.FC<TeamMetadataEditorProps> = ({ 
  open, 
  onClose, 
  team 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [locationData, setLocationData] = useState<PlaceLocationData | null>(null);
  const [locationCleared, setLocationCleared] = useState(false);
  const [overrideEquipmentLocation, setOverrideEquipmentLocation] = useState(
    team.override_equipment_location ?? false
  );
  const queryClient = useQueryClient();
  const { isLoaded } = useGoogleMapsLoader();

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
    const formData = new FormData(e.target as HTMLFormElement);
    
    const updates: Record<string, unknown> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      override_equipment_location: overrideEquipmentLocation,
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

    setIsLoading(true);
    try {
      await updateTeam(team.id, updates);
      
      queryClient.invalidateQueries({ queryKey: ['team', team.id] });
      queryClient.invalidateQueries({ queryKey: ['teams', team.organization_id] });
      
      toast({
        title: "Team updated",
        description: "Team information has been successfully updated.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error updating team",
        description: error instanceof Error ? error.message : "Failed to update team. Please try again.",
        variant: "destructive",
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
                  defaultValue={team.description}
                  placeholder="Brief description of the team's responsibilities..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <GooglePlacesAutocomplete
                  value={locationData?.formatted_address ?? existingAddress}
                  onPlaceSelect={handlePlaceSelect}
                  onClear={handleLocationClear}
                  placeholder="Search for a team address..."
                  isLoaded={isLoaded}
                />
              </div>

              <div className="flex items-center gap-2 rounded-md border p-3">
                <Checkbox
                  id="override_equipment_location"
                  checked={overrideEquipmentLocation}
                  onCheckedChange={(checked) => setOverrideEquipmentLocation(!!checked)}
                />
                <Label
                  htmlFor="override_equipment_location"
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  Override Equipment Location
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring cursor-help"
                        aria-label="Override equipment location info"
                      >
                        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px]">
                      <p>
                        When enabled, all equipment assigned to this team will
                        use this team's address as their effective location on
                        the Fleet Map.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMetadataEditor;
