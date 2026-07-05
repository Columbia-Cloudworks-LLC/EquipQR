import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { StructuredLocationEditorControls } from '@/components/location/StructuredLocationEditorControls';
import { useStructuredLocationEditorState } from '@/components/location/structuredLocationEditorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateOrganization } from '@/features/organization/services/organizationService';
import type { OrganizationUpdatePayload } from '@/features/organization/types/organization';
import {
  buildOrganizationInventoryDefaultAddress,
  organizationInventoryDefaultToPlaceData,
  placeDataToOrganizationInventoryDefaultLocation,
} from '@/features/inventory/utils/inventoryLocationUtils';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useIsDarkTheme } from '@/hooks/useThemeVersion';
import type { SessionOrganization } from '@/types/session';
import { toast } from 'sonner';

type OrganizationInventoryDefaultLocationSectionProps = {
  organization: SessionOrganization;
  onSaved: () => Promise<void>;
};

export function OrganizationInventoryDefaultLocationSection({
  organization,
  onSaved,
}: OrganizationInventoryDefaultLocationSectionProps) {
  const { isLoaded: isPlacesLoaded } = useGoogleMapsLoader();
  const isDark = useIsDarkTheme();
  const { googleMapsKey, mapId } = useGoogleMapsKey();

  const [locationName, setLocationName] = useState(
    organization.inventoryDefaultLocationName ?? '',
  );
  const [isSaving, setIsSaving] = useState(false);

  const initialPlace = useMemo(
    () =>
      organizationInventoryDefaultToPlaceData({
        inventory_default_location_name: organization.inventoryDefaultLocationName,
        inventory_default_location_address: organization.inventoryDefaultLocationAddress,
        inventory_default_location_city: organization.inventoryDefaultLocationCity,
        inventory_default_location_state: organization.inventoryDefaultLocationState,
        inventory_default_location_country: organization.inventoryDefaultLocationCountry,
        inventory_default_location_lat: organization.inventoryDefaultLocationLat,
        inventory_default_location_lng: organization.inventoryDefaultLocationLng,
      }),
    [
      organization.inventoryDefaultLocationAddress,
      organization.inventoryDefaultLocationCity,
      organization.inventoryDefaultLocationCountry,
      organization.inventoryDefaultLocationLat,
      organization.inventoryDefaultLocationLng,
      organization.inventoryDefaultLocationName,
      organization.inventoryDefaultLocationState,
    ],
  );

  const editor = useStructuredLocationEditorState({
    initialPlace,
    fallbackAddress: buildOrganizationInventoryDefaultAddress({
      inventory_default_location_address: organization.inventoryDefaultLocationAddress,
      inventory_default_location_city: organization.inventoryDefaultLocationCity,
      inventory_default_location_state: organization.inventoryDefaultLocationState,
      inventory_default_location_country: organization.inventoryDefaultLocationCountry,
    }),
  });

  useEffect(() => {
    setLocationName(organization.inventoryDefaultLocationName ?? '');
  }, [organization.inventoryDefaultLocationName, organization.id]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const payload: OrganizationUpdatePayload = {
        inventory_default_location_name: locationName.trim() || null,
        ...placeDataToOrganizationInventoryDefaultLocation(
          editor.isCleared ? null : editor.pendingPlace,
        ),
      };

      const success = await updateOrganization(organization.id, payload);
      if (!success) {
        throw new Error('Failed to update organization');
      }

      await onSaved();
      toast.success('Inventory default location saved');
    } catch (error) {
      console.error('Error saving inventory default location:', error);
      toast.error('Failed to save inventory default location');
    } finally {
      setIsSaving(false);
    }
  }, [editor.isCleared, editor.pendingPlace, locationName, onSaved, organization.id]);

  return (
    <div className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
        <div className="pt-0.5">
          <h2 className="text-sm font-semibold">Inventory Default Location</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Parts inherit this address until they set their own storage location.
          </p>
        </div>
        <div className="md:col-span-2 space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="inventory-default-location-name">Default Location Name</Label>
            <Input
              id="inventory-default-location-name"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="e.g., Main Shop, Yard Cage"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Optional nickname shown when parts inherit this organization default.
            </p>
          </div>

          <StructuredLocationEditorControls
            locationLabel="Default storage address"
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
            liveCaptureTitle="Set inventory default from this device"
            liveCaptureConfirmLabel="Use this location"
            isSaving={isSaving}
          />

          <div className="flex justify-stretch sm:justify-end">
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto gap-1.5"
              disabled={!editor.canSave || isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save default location'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
