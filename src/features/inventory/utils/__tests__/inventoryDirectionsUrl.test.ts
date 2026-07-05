import { describe, expect, it } from 'vitest';
import { buildInventoryDirectionsUrl } from '@/features/inventory/utils/inventoryDirectionsUrl';

describe('buildInventoryDirectionsUrl', () => {
  it('prefers coordinate-based directions when lat/lng are present', () => {
    const url = buildInventoryDirectionsUrl({
      formattedAddress: '500 Org Default St, Austin, TX, USA',
      lat: 30.27,
      lng: -97.74,
    });

    expect(url).toContain('30.27,-97.74');
    expect(url).toContain('/dir/?api=1&destination=');
  });

  it('falls back to address-based directions when coordinates are missing', () => {
    const url = buildInventoryDirectionsUrl({
      formattedAddress: '500 Org Default St, Austin, TX, USA',
      lat: null,
      lng: null,
    });

    expect(url).toContain(encodeURIComponent('500 Org Default St, Austin, TX, USA'));
  });
});
