import React from 'react';
import { Navigation } from 'lucide-react';
import { CenterPinMapPicker } from '@/components/location/CenterPinMapPicker';
import { LiveLocationCaptureDialog } from '@/components/location/LiveLocationCaptureDialog';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TeamLocationFormFields } from '@/features/teams/components/TeamLocationFormFields';

type StructuredLocationEditorControlsProps = {
  locationLabel: string;
  locationAddress: string;
  onPlaceSelect: (data: PlaceLocationData) => void;
  onClear: () => void;
  isPlacesLoaded: boolean;
  previewCenter: { lat: number; lng: number } | null;
  recenterKey: number;
  onCenterChange: (center: { lat: number; lng: number }) => void;
  googleMapsKey?: string;
  mapId?: string;
  isDark: boolean;
  isLiveCaptureOpen: boolean;
  onLiveCaptureOpenChange: (open: boolean) => void;
  onConfirmLiveLocation: (data: PlaceLocationData) => Promise<void>;
  liveCaptureTitle: string;
  liveCaptureConfirmLabel: string;
  isSaving?: boolean;
  disabled?: boolean;
  description?: string;
  showMapPreviewLabel?: boolean;
  className?: string;
};

export function StructuredLocationEditorControls({
  locationLabel,
  locationAddress,
  onPlaceSelect,
  onClear,
  isPlacesLoaded,
  previewCenter,
  recenterKey,
  onCenterChange,
  googleMapsKey,
  mapId,
  isDark,
  isLiveCaptureOpen,
  onLiveCaptureOpenChange,
  onConfirmLiveLocation,
  liveCaptureTitle,
  liveCaptureConfirmLabel,
  isSaving = false,
  disabled = false,
  description,
  showMapPreviewLabel = false,
  className,
}: StructuredLocationEditorControlsProps) {
  return (
    <>
      <div className={className ?? 'space-y-4'}>
        <div className="space-y-1.5">
          <TeamLocationFormFields
            locationAddress={locationAddress}
            onPlaceSelect={onPlaceSelect}
            onClear={onClear}
            isLoaded={isPlacesLoaded}
            locationLabel={locationLabel}
          />
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onLiveCaptureOpenChange(true)}
          disabled={disabled || isSaving}
        >
          <Navigation className="h-3.5 w-3.5" />
          Use my current location
        </Button>

        {previewCenter && googleMapsKey ? (
          <div className={showMapPreviewLabel ? 'space-y-2' : undefined}>
            {showMapPreviewLabel ? (
              <Label className="text-sm font-medium">Map preview</Label>
            ) : null}
            <CenterPinMapPicker
              center={previewCenter}
              recenterTarget={previewCenter}
              recenterKey={recenterKey}
              onCenterChange={onCenterChange}
              googleMapsKey={googleMapsKey}
              mapId={mapId}
              isDark={isDark}
              className="rounded-lg border"
            />
          </div>
        ) : null}
      </div>

      <LiveLocationCaptureDialog
        open={isLiveCaptureOpen}
        onOpenChange={onLiveCaptureOpenChange}
        onConfirm={onConfirmLiveLocation}
        isSaving={isSaving}
        title={liveCaptureTitle}
        confirmLabel={liveCaptureConfirmLabel}
      />
    </>
  );
}
