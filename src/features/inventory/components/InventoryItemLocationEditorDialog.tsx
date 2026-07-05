import React, { useCallback, useMemo, useState } from 'react';
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
import {
  buildInventoryAddress,
  inventoryLocationToPlaceData,
  placeDataToInventoryStructuredLocation,
} from '@/features/inventory/utils/inventoryLocationUtils';
import type { InventoryStructuredLocationFields } from '@/features/inventory/utils/inventoryLocationUtils';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useIsDarkTheme } from '@/hooks/useThemeVersion';

type InventoryItemLocationEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structuredLocation: InventoryStructuredLocationFields;
  onSave: (location: InventoryStructuredLocationFields) => Promise<void>;
};

export function InventoryItemLocationEditorDialog({
  open,
  onOpenChange,
  structuredLocation,
  onSave,
}: InventoryItemLocationEditorDialogProps) {
  const { isLoaded: isPlacesLoaded } = useGoogleMapsLoader();
  const isDark = useIsDarkTheme();
  const { googleMapsKey, mapId } = useGoogleMapsKey();
  const [isSaving, setIsSaving] = useState(false);

  const initialPlace = useMemo(
    () => inventoryLocationToPlaceData(structuredLocation),
    [structuredLocation],
  );

  const editor = useStructuredLocationEditorState({
    active: open,
    initialPlace,
    fallbackAddress: buildInventoryAddress(structuredLocation),
  });

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const nextLocation = editor.isCleared
        ? placeDataToInventoryStructuredLocation(null)
        : placeDataToInventoryStructuredLocation(editor.pendingPlace);
      await onSave(nextLocation);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [editor.isCleared, editor.pendingPlace, onOpenChange, onSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Set part storage location</DialogTitle>
          <DialogDescription>
            Search for an address or capture your current location. This overrides the organization
            inventory default for this part only.
          </DialogDescription>
        </DialogHeader>

        <StructuredLocationEditorControls
          locationLabel="Storage address"
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
          liveCaptureTitle="Set part storage location from this device"
          liveCaptureConfirmLabel="Use this location"
          isSaving={isSaving}
        />

        <StructuredLocationEditorDialogFooter
          onCancel={() => onOpenChange(false)}
          onSave={handleSave}
          canSave={editor.canSave}
          isSaving={isSaving}
          saveLabel="Save storage location"
        />
      </DialogContent>
    </Dialog>
  );
}
