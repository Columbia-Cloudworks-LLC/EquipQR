import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import { OrganizationInventoryDefaultLocationSection } from '@/features/organization/components/OrganizationInventoryDefaultLocationSection';
import type { SessionOrganization } from '@/types/session';

const mockUpdateOrganization = vi.fn().mockResolvedValue(true);
const mockOnSaved = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/organization/services/organizationService', () => ({
  updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/useGoogleMapsLoader', () => ({
  useGoogleMapsLoader: vi.fn(() => ({ isLoaded: true })),
}));

vi.mock('@/hooks/useGoogleMapsKey', () => ({
  useGoogleMapsKey: vi.fn(() => ({
    googleMapsKey: 'test-key',
    mapId: 'test-map-id',
    isLoading: false,
    error: null,
    retry: vi.fn(),
  })),
}));

vi.mock('@/hooks/useThemeVersion', () => ({
  useIsDarkTheme: vi.fn(() => false),
  useThemeVersion: vi.fn(() => 0),
}));

vi.mock('@/components/ui/GooglePlacesAutocomplete', () => ({
  default: ({
    onPlaceSelect,
    onClear,
  }: {
    onPlaceSelect: (data: {
      formatted_address: string;
      street: string;
      city: string;
      state: string;
      country: string;
      lat: number;
      lng: number;
    }) => void;
    onClear: () => void;
  }) => (
    <div>
      <button
        type="button"
        data-testid="org-inventory-places-autocomplete"
        onClick={() =>
          onPlaceSelect({
            formatted_address: '500 Org Default St, Austin, TX, USA',
            street: '500 Org Default St',
            city: 'Austin',
            state: 'TX',
            country: 'USA',
            lat: 30.27,
            lng: -97.74,
          })
        }
      >
        Search default storage address
      </button>
      <button type="button" onClick={onClear}>
        Clear address
      </button>
    </div>
  ),
}));

vi.mock('@/components/location/CenterPinMapPicker', () => ({
  CenterPinMapPicker: () => null,
}));

vi.mock('@/components/location/LiveLocationCaptureDialog', () => ({
  LiveLocationCaptureDialog: () => null,
}));

const baseOrganization: SessionOrganization = {
  id: 'org-1',
  name: 'Test Org',
  plan: 'free',
  memberCount: 1,
  maxMembers: 5,
  features: [],
  scanLocationCollectionEnabled: true,
  userRole: 'owner',
  userStatus: 'active',
};

describe('OrganizationInventoryDefaultLocationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves inventory default location with Places-style address data', async () => {
    render(
      <OrganizationInventoryDefaultLocationSection
        organization={baseOrganization}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText(/default location name/i), {
      target: { value: 'Main Shop' },
    });
    fireEvent.click(screen.getByTestId('org-inventory-places-autocomplete'));
    fireEvent.click(screen.getByRole('button', { name: /save default location/i }));

    await waitFor(() => {
      expect(mockUpdateOrganization).toHaveBeenCalledWith('org-1', {
        inventory_default_location_name: 'Main Shop',
        inventory_default_location_address: '500 Org Default St',
        inventory_default_location_city: 'Austin',
        inventory_default_location_state: 'TX',
        inventory_default_location_country: 'USA',
        inventory_default_location_lat: 30.27,
        inventory_default_location_lng: -97.74,
      });
    });

    expect(mockOnSaved).toHaveBeenCalled();
  });

  it('clears inventory default location fields', async () => {
    render(
      <OrganizationInventoryDefaultLocationSection
        organization={{
          ...baseOrganization,
          inventoryDefaultLocationName: 'Main Shop',
          inventoryDefaultLocationAddress: '500 Org Default St',
          inventoryDefaultLocationCity: 'Austin',
          inventoryDefaultLocationState: 'TX',
          inventoryDefaultLocationCountry: 'USA',
          inventoryDefaultLocationLat: 30.27,
          inventoryDefaultLocationLng: -97.74,
        }}
        onSaved={mockOnSaved}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /clear address/i }));
    fireEvent.click(screen.getByRole('button', { name: /save default location/i }));

    await waitFor(() => {
      expect(mockUpdateOrganization).toHaveBeenCalledWith('org-1', {
        inventory_default_location_name: 'Main Shop',
        inventory_default_location_address: null,
        inventory_default_location_city: null,
        inventory_default_location_state: null,
        inventory_default_location_country: null,
        inventory_default_location_lat: null,
        inventory_default_location_lng: null,
      });
    });
  });
});
