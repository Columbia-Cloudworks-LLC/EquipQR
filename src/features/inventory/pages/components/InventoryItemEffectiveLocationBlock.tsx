import React, { useMemo, useState } from 'react';
import { Edit, MapPin, Navigation } from 'lucide-react';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { LocationDirectionsMiniMap } from '@/components/location/LocationDirectionsMiniMap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InventoryItemLocationEditorDialog } from '@/features/inventory/components/InventoryItemLocationEditorDialog';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import { buildInventoryDirectionsUrl } from '@/features/inventory/utils/inventoryDirectionsUrl';
import {
  getInventoryLocationSourceLabel,
  hasInventoryStructuredLocation,
  hasOrganizationInventoryDefaultLocation,
  resolveEffectiveInventoryLocation,
} from '@/features/inventory/utils/inventoryLocationUtils';
import type {
  InventoryStructuredLocationFields,
  OrganizationInventoryDefaultLocationFields,
} from '@/features/inventory/utils/inventoryLocationUtils';
import type { SessionOrganization } from '@/types/session';

type InventoryItemEffectiveLocationBlockProps = {
  item: InventoryItem;
  organization: SessionOrganization | null;
  canEdit: boolean;
  onSaveStructuredLocation: (location: InventoryStructuredLocationFields) => Promise<void>;
};

function organizationToDefaultFields(
  organization: SessionOrganization | null,
): OrganizationInventoryDefaultLocationFields | null {
  if (!organization) {
    return null;
  }

  return {
    inventory_default_location_name: organization.inventoryDefaultLocationName ?? null,
    inventory_default_location_address: organization.inventoryDefaultLocationAddress ?? null,
    inventory_default_location_city: organization.inventoryDefaultLocationCity ?? null,
    inventory_default_location_state: organization.inventoryDefaultLocationState ?? null,
    inventory_default_location_country: organization.inventoryDefaultLocationCountry ?? null,
    inventory_default_location_lat: organization.inventoryDefaultLocationLat ?? null,
    inventory_default_location_lng: organization.inventoryDefaultLocationLng ?? null,
  };
}

export function InventoryItemEffectiveLocationBlock({
  item,
  organization,
  canEdit,
  onSaveStructuredLocation,
}: InventoryItemEffectiveLocationBlockProps) {
  const [editorOpen, setEditorOpen] = useState(false);

  const orgDefault = organizationToDefaultFields(organization);
  const orgHasDefault = orgDefault != null && hasOrganizationInventoryDefaultLocation(orgDefault);
  const effectiveLocation = useMemo(
    () => resolveEffectiveInventoryLocation(item, orgDefault),
    [item, orgDefault],
  );
  const hasPartOverride = hasInventoryStructuredLocation(item);
  const directionsUrl = effectiveLocation ? buildInventoryDirectionsUrl(effectiveLocation) : null;
  const mapCenter =
    effectiveLocation?.lat != null && effectiveLocation.lng != null
      ? { lat: effectiveLocation.lat, lng: effectiveLocation.lng }
      : null;

  if (!effectiveLocation) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-muted p-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Storage address</p>
            <p className="text-xs text-muted-foreground">
              {orgHasDefault
                ? 'This part has no address override. Set one here or rely on the organization default once it is saved to your session.'
                : 'Set a part-specific address here, or configure an organization inventory default in Organization Settings so all parts inherit the same address.'}
            </p>
          </div>
        </div>
        {canEdit ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditorOpen(true)}
            className="gap-1.5"
          >
            <Navigation className="h-3.5 w-3.5" />
            Set storage address
          </Button>
        ) : null}

        {canEdit ? (
          <InventoryItemLocationEditorDialog
            open={editorOpen}
            onOpenChange={setEditorOpen}
            structuredLocation={item}
            onSave={onSaveStructuredLocation}
          />
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-muted-foreground">Storage address</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {getInventoryLocationSourceLabel(effectiveLocation.source)}
              </Badge>
              {effectiveLocation.source === 'organization_default' ? (
                <span className="text-xs text-muted-foreground">
                  Address inherited from organization
                </span>
              ) : null}
            </div>
          </div>
          {canEdit ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setEditorOpen(true)}
            >
              <Edit className="h-3.5 w-3.5" />
              {hasPartOverride ? 'Edit part address' : 'Override address'}
            </Button>
          ) : null}
        </div>

        {mapCenter && directionsUrl ? (
          <LocationDirectionsMiniMap
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            address={effectiveLocation.formattedAddress || undefined}
            directionsUrl={directionsUrl}
          />
        ) : null}

        <ClickableAddress
          address={effectiveLocation.formattedAddress || undefined}
          lat={effectiveLocation.lat ?? undefined}
          lng={effectiveLocation.lng ?? undefined}
          className="text-base"
        />

        {canEdit && hasPartOverride ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-muted-foreground hover:text-foreground"
            onClick={() =>
              void onSaveStructuredLocation({
                location_address: null,
                location_city: null,
                location_state: null,
                location_country: null,
                location_lat: null,
                location_lng: null,
              })
            }
          >
            Clear part-specific address and use organization default
          </Button>
        ) : null}
      </div>

      {canEdit ? (
        <InventoryItemLocationEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          structuredLocation={item}
          onSave={onSaveStructuredLocation}
        />
      ) : null}
    </>
  );
}
