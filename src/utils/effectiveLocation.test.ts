import { describe, it, expect } from 'vitest';
import {
  buildEquipmentLocationOptions,
  buildGoogleMapsUrl,
  buildGoogleMapsUrlFromCoords,
  getLocationSourceLabel,
  isTeamLocationFallbackAvailable,
  parseLastKnownLocation,
  resolveEffectiveLocation,
  resolveEquipmentCoordinates,
  resolveLocationByMode,
  LOCATION_SOURCE_LABELS,
} from './effectiveLocation';

describe('effectiveLocation', () => {
  const team = {
    override_equipment_location: true,
    location_lat: 32.7767,
    location_lng: -96.797,
    location_address: '123 Main',
    location_city: 'Dallas',
    location_state: 'TX',
    location_country: 'US',
  };

  it('labels every canonical source for UI display', () => {
    expect(getLocationSourceLabel('team')).toBe('Team location');
    expect(getLocationSourceLabel('manual')).toBe('Equipment location');
    expect(getLocationSourceLabel('scan')).toBe('Last known scan location');
    expect(getLocationSourceLabel('legacy')).toBe('Legacy coordinates');
    expect(Object.keys(LOCATION_SOURCE_LABELS)).toHaveLength(4);
  });

  it('prefers last scan over assigned equipment and team fallback', () => {
    const result = resolveEffectiveLocation({
      team,
      equipment: {
        assigned_location_lat: 30,
        assigned_location_lng: -97,
      },
      lastScan: { lat: 40.919345, lng: -90.659318 },
    });

    expect(result?.source).toBe('scan');
    expect(result?.lat).toBe(40.919345);
  });

  it('prefers assigned address over team fallback and legacy text', () => {
    const result = resolveEffectiveLocation({
      team,
      equipment: {
        assigned_location_lat: 30.2672,
        assigned_location_lng: -97.7431,
        assigned_location_city: 'Austin',
        locationText: '40.919345, -90.659318',
      },
      lastScan: { lat: 40.919433, lng: -90.659299 },
    });

    expect(result?.source).toBe('scan');
  });

  it('prefers assigned address over team when no scan exists', () => {
    const result = resolveEffectiveLocation({
      team,
      equipment: {
        assigned_location_lat: 30.2672,
        assigned_location_lng: -97.7431,
        assigned_location_city: 'Austin',
        locationText: '40.919345, -90.659318',
      },
    });

    expect(result?.source).toBe('manual');
    expect(result?.sourceLabel).toBe('Equipment location');
    expect(result?.lat).toBe(30.2672);
  });

  it('uses team fallback when equipment has no assigned address or scan', () => {
    const result = resolveEffectiveLocation({
      team,
      equipment: {},
    });

    expect(result?.source).toBe('team');
    expect(result?.lat).toBe(32.7767);
    expect(result?.formattedAddress).toContain('Dallas');
  });

  it('uses team fallback when team has coordinates regardless of override flag', () => {
    expect(
      isTeamLocationFallbackAvailable({
        location_lat: 32.7767,
        location_lng: -96.797,
      }),
    ).toBe(true);

    const result = resolveEffectiveLocation({
      team: {
        override_equipment_location: false,
        location_lat: 32.7767,
        location_lng: -96.797,
        location_city: 'Dallas',
      },
      equipment: { use_team_location: false },
    });

    expect(result?.source).toBe('team');
  });

  it('uses scan GPS when no assigned address exists', () => {
    const result = resolveEffectiveLocation({
      equipment: {},
      lastScan: {
        lat: 40.919345,
        lng: -90.659318,
        updatedAt: '2026-04-15T08:30:00Z',
        formattedAddress: '40.919345, -90.659318',
      },
    });

    expect(result?.source).toBe('scan');
    expect(result?.updatedAt).toBe('2026-04-15T08:30:00Z');
  });

  it('parses last_known_location into scan fallback input', () => {
    const scan = parseLastKnownLocation({
      latitude: 40.919345,
      longitude: -90.659318,
      updated_at: '2026-04-15T08:30:00Z',
    });

    expect(scan?.lat).toBe(40.919345);
    expect(scan?.lng).toBe(-90.659318);
    expect(scan?.updatedAt).toBe('2026-04-15T08:30:00Z');
  });

  it('builds selectable options for each available source', () => {
    const options = buildEquipmentLocationOptions({
      team,
      equipment: {
        assigned_location_lat: 30,
        assigned_location_lng: -97,
        locationText: '40.919345, -90.659318',
      },
      lastScan: { lat: 40.919433, lng: -90.659299 },
    });

    expect(options.map((option) => option.mode)).toEqual(['scan', 'manual', 'legacy', 'team']);
  });

  it('resolves explicit display modes independently of effective hierarchy', () => {
    const params = {
      team,
      equipment: {
        assigned_location_lat: 30,
        assigned_location_lng: -97,
      },
      lastScan: { lat: 40.919345, lng: -90.659318 },
    };
    const options = buildEquipmentLocationOptions(params);

    const scanView = resolveLocationByMode('scan', options, params);
    expect(scanView?.source).toBe('scan');
    expect(scanView?.lat).toBe(40.919345);

    const effectiveView = resolveLocationByMode('effective', options, params);
    expect(effectiveView?.source).toBe('scan');
  });

  it('defers scan fallback until after legacy parse in coordinate resolution when scan omitted', () => {
    const withoutScan = resolveEquipmentCoordinates({
      equipment: {
        locationText: '10, 20',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      parseLegacy: (text) => (text === '10, 20' ? { lat: 10, lng: 20 } : null),
    });

    expect(withoutScan?.source).toBe('legacy');
    expect(withoutScan?.coords).toEqual({ lat: 10, lng: 20 });
  });

  it('builds Google Maps URLs for address and coordinate destinations', () => {
    expect(buildGoogleMapsUrl('123 Main St')).toContain(encodeURIComponent('123 Main St'));
    expect(buildGoogleMapsUrlFromCoords(40.919345, -90.659318)).toContain('40.919345,-90.659318');
  });
});
