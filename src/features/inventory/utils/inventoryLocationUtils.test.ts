import { describe, expect, it } from 'vitest';
import {
  buildInventoryAddress,
  getInventoryLocationSourceLabel,
  hasInventoryStructuredLocation,
  resolveEffectiveInventoryLocation,
} from '@/features/inventory/utils/inventoryLocationUtils';

describe('inventoryLocationUtils', () => {
  it('builds a formatted inventory address from structured fields', () => {
    expect(
      buildInventoryAddress({
        location_address: '100 Warehouse Rd',
        location_city: 'Austin',
        location_state: 'TX',
        location_country: 'USA',
        location_lat: 30.27,
        location_lng: -97.74,
      }),
    ).toBe('100 Warehouse Rd, Austin, TX, USA');
  });

  it('detects part-specific structured location from coordinates', () => {
    expect(
      hasInventoryStructuredLocation({
        location_address: null,
        location_city: null,
        location_state: null,
        location_country: null,
        location_lat: 30.27,
        location_lng: -97.74,
      }),
    ).toBe(true);
  });

  it('resolves part location before organization default', () => {
    const effective = resolveEffectiveInventoryLocation(
      {
        location: 'Shelf A',
        location_address: '200 Part Bin Ln',
        location_city: 'Dallas',
        location_state: 'TX',
        location_country: 'USA',
        location_lat: 32.77,
        location_lng: -96.79,
      },
      {
        inventory_default_location_name: 'Main Shop',
        inventory_default_location_address: '500 Org Default St',
        inventory_default_location_city: 'Austin',
        inventory_default_location_state: 'TX',
        inventory_default_location_country: 'USA',
        inventory_default_location_lat: 30.27,
        inventory_default_location_lng: -97.74,
      },
    );

    expect(effective?.source).toBe('part');
    expect(effective?.formattedAddress).toContain('200 Part Bin Ln');
    expect(getInventoryLocationSourceLabel(effective!.source)).toBe('Part location');
  });

  it('falls back to organization default when item has no structured location', () => {
    const effective = resolveEffectiveInventoryLocation(
      {
        location: 'Shelf A',
        location_address: null,
        location_city: null,
        location_state: null,
        location_country: null,
        location_lat: null,
        location_lng: null,
      },
      {
        inventory_default_location_name: 'Main Shop',
        inventory_default_location_address: '500 Org Default St',
        inventory_default_location_city: 'Austin',
        inventory_default_location_state: 'TX',
        inventory_default_location_country: 'USA',
        inventory_default_location_lat: 30.27,
        inventory_default_location_lng: -97.74,
      },
    );

    expect(effective?.source).toBe('organization_default');
    expect(effective?.locationName).toBe('Shelf A');
    expect(effective?.formattedAddress).toContain('500 Org Default St');
    expect(getInventoryLocationSourceLabel(effective!.source)).toBe('Organization default');
  });

  it('returns null when neither item nor organization default has geo data', () => {
    expect(
      resolveEffectiveInventoryLocation(
        {
          location: 'Shelf A',
          location_address: null,
          location_city: null,
          location_state: null,
          location_country: null,
          location_lat: null,
          location_lng: null,
        },
        {
          inventory_default_location_name: null,
          inventory_default_location_address: null,
          inventory_default_location_city: null,
          inventory_default_location_state: null,
          inventory_default_location_country: null,
          inventory_default_location_lat: null,
          inventory_default_location_lng: null,
        },
      ),
    ).toBeNull();
  });
});
