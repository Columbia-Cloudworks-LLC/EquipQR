import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StructuredLocationEditorControls } from '@/components/location/StructuredLocationEditorControls';
import { StructuredLocationEditorDialogFooter } from '@/components/location/StructuredLocationEditorDialogFooter';
import { useStructuredLocationEditorState } from '@/components/location/structuredLocationEditorState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { updateTeam } from '@/features/teams/services/teamService';
import type { TeamWithMembers } from '@/features/teams/services/teamService';
import {
  buildTeamAddress,
  teamLocationToPlaceData,
} from '@/features/teams/utils/teamLocationUtils';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useIsDarkTheme } from '@/hooks/useThemeVersion';
import { useToast } from '@/hooks/use-toast';

type TeamLocationEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithMembers;
};

export function TeamLocationEditorDialog({
  open,
  onOpenChange,
  team,
}: TeamLocationEditorDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isLoaded: isPlacesLoaded } = useGoogleMapsLoader();
  const isDark = useIsDarkTheme();
  const { googleMapsKey, mapId } = useGoogleMapsKey();
  const [isSaving, setIsSaving] = useState(false);

  const initialPlace = useMemo(() => teamLocationToPlaceData(team), [team]);

  const editor = useStructuredLocationEditorState({
    active: open,
    initialPlace,
    fallbackAddress: buildTeamAddress(team),
  });

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const updates: Record<string, unknown> = {};

      if (editor.isCleared) {
        updates.location_address = null;
        updates.location_city = null;
        updates.location_state = null;
        updates.location_country = null;
        updates.location_lat = null;
        updates.location_lng = null;
      } else if (editor.pendingPlace) {
        updates.location_address = editor.pendingPlace.street || null;
        updates.location_city = editor.pendingPlace.city || null;
        updates.location_state = editor.pendingPlace.state || null;
        updates.location_country = editor.pendingPlace.country || null;
        updates.location_lat = editor.pendingPlace.lat ?? null;
        updates.location_lng = editor.pendingPlace.lng ?? null;
      }

      await updateTeam(team.id, updates);
      await queryClient.invalidateQueries({ queryKey: ['team', team.id] });
      await queryClient.invalidateQueries({ queryKey: ['teams'] });

      toast({
        title: 'Team location saved',
        description: 'This team can now appear on the Fleet Map.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Unable to save team location',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [editor.isCleared, editor.pendingPlace, onOpenChange, queryClient, team.id, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Set team location</DialogTitle>
          <DialogDescription>
            Search for an address or use your device location once, then pan the map so the pin sits
            on the team yard or shop. Equipment without its own location inherits this address
            automatically.
          </DialogDescription>
        </DialogHeader>

        <StructuredLocationEditorControls
          locationLabel="Team address"
          locationAddress={editor.addressValue}
          onPlaceSelect={editor.handlePlaceSelect}
          onClear={editor.handleClear}
          isPlacesLoaded={isPlacesLoaded}
          previewCenter={editor.previewCenter}
          recenterKey={editor.recenterKey}
          onCenterChange={editor.handleMapCenterChange}
          googleMapsKey={googleMapsKey}
          mapId={mapId}
          isDark={isDark}
          isLiveCaptureOpen={editor.isLiveCaptureOpen}
          onLiveCaptureOpenChange={editor.setIsLiveCaptureOpen}
          onConfirmLiveLocation={editor.handleSaveLiveLocation}
          liveCaptureTitle="Set team location from this device"
          liveCaptureConfirmLabel="Use this location"
          isSaving={isSaving}
        />

        <StructuredLocationEditorDialogFooter
          onCancel={() => onOpenChange(false)}
          onSave={handleSave}
          canSave={editor.canSave}
          isSaving={isSaving}
          saveLabel="Save team location"
        />
      </DialogContent>
    </Dialog>
  );
}
