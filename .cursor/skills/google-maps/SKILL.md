---
name: google-maps
description: Expert guide for developing, debugging, and extending Google Maps integration in EquipQR. Use when working with maps, geocoding, places autocomplete, location features, fleet map, Google Maps API keys, or address components. Also use when the user mentions "google maps", "geocode", "fleet map", "places autocomplete", "map marker", "address picker", or "location".
source: andrejones92/canifi-life-os (adapted for EquipQR)
---

# Google Maps Integration — EquipQR

## Architecture Overview

EquipQR uses Google Maps for three main features: **Fleet Map** visualization, **Places Autocomplete** address picking, and **Geocoding**. The integration spans frontend hooks/components and server-side Supabase Edge Functions.

```
Browser                                    Supabase Edge Functions
───────                                    ──────────────────────
useGoogleMapsKey ──→ public-google-maps-key ──→ GOOGLE_MAPS_BROWSER_KEY
useGoogleMapsLoader ──→ Google Maps JS API (loads <script> with browser key)
GooglePlacesAutocomplete ──→ PlaceAutocompleteElement (web component)
                         └─→ places-autocomplete edge fn (fallback) ──→ GOOGLE_MAPS_SERVER_KEY
MapView (GoogleMap) ──→ @react-google-maps/api
ClickableAddress ──→ maps.google.com deep link
geocode-location edge fn ──→ GOOGLE_MAPS_SERVER_KEY + geocoded_locations cache
```

## API Keys

Two separate keys with different restrictions:

| Key | Env Var | Where Set | Used By |
|-----|---------|-----------|---------|
| **Browser key** | `GOOGLE_MAPS_BROWSER_KEY` | Supabase Edge Function secrets | `public-google-maps-key` → served to browser |
| **Server key** | `GOOGLE_MAPS_SERVER_KEY` | Supabase Edge Function secrets | `geocode-location`, `places-autocomplete` |

**Local development**: Set both in `supabase/functions/.env` (NOT the root `.env`).

**Production**: Set in Supabase Dashboard → Project → Settings → Edge Functions → Secrets.

**Important**: These are NOT Vercel env vars. Redeploying on Vercel does not affect these secrets.

### Legacy key names (still supported with fallback)

| Legacy Name | New Canonical Name |
|---|---|
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | `GOOGLE_MAPS_BROWSER_KEY` |
| `GOOGLE_MAPS_API_KEY` | `GOOGLE_MAPS_SERVER_KEY` |
| `VITE_GOOGLE_MAPS_API_KEY` | `GOOGLE_MAPS_SERVER_KEY` |

All edge functions prefer the new name and fall back to legacy names.

## Frontend Components & Hooks

### `useGoogleMapsKey` (`src/hooks/useGoogleMapsKey.ts`)

Fetches the browser API key from the `public-google-maps-key` edge function. Returns `{ googleMapsKey, isLoading, error, retry }`.

### `useGoogleMapsLoader` (`src/hooks/useGoogleMapsLoader.ts`)

**Singleton** Google Maps JS API loader. Ensures the `<script>` tag is loaded exactly once across all components. Returns `{ isLoaded, loadError, googleMapsKey, isKeyLoading, keyError, retry }`.

**Always use this hook** — never load the Maps JS API manually.

### `GooglePlacesAutocomplete` (`src/components/ui/GooglePlacesAutocomplete.tsx`)

Address picker with three-tier fallback strategy:
1. **Web component** — `PlaceAutocompleteElement` (Google's native widget)
2. **Edge function** — `places-autocomplete` edge function proxy (if web component fails, e.g. Places API New not enabled)
3. **Plain text** — simple text input fallback

Props: `{ value, onPlaceSelect, onClear, placeholder, disabled, className, isLoaded }`.

Returns `PlaceLocationData`: `{ formatted_address, street, city, state, country, lat, lng }`.

### `MapView` (`src/features/fleet-map/components/MapView.tsx`)

Fleet map component using `@react-google-maps/api` (`GoogleMap`, `MarkerF`, `InfoWindowF`). Renders colored markers by location source (team, equipment, scan, geocoded) and star markers for team HQ locations.

### `ClickableAddress` (`src/components/ui/ClickableAddress.tsx`)

Renders an address as a link that opens Google Maps.

## Edge Functions

### `public-google-maps-key`

- **Purpose**: Serve the browser API key to authenticated users
- **Auth**: JWT required (`verify_jwt = true`)
- **Key**: `GOOGLE_MAPS_BROWSER_KEY`
- **Pattern**: User-scoped client with `requireUser`

### `geocode-location`

- **Purpose**: Geocode addresses with caching in `geocoded_locations` table
- **Auth**: JWT + org membership verification
- **Key**: `GOOGLE_MAPS_SERVER_KEY`
- **Rate limit**: 30 cache misses per org per minute
- **Cache**: `geocoded_locations` table (upsert on `organization_id, normalized_text`)
- **Input normalization**: lowercase, trim, collapse whitespace

### `places-autocomplete`

- **Purpose**: Proxy Google Places Autocomplete and Details APIs
- **Auth**: JWT required
- **Key**: `GOOGLE_MAPS_SERVER_KEY`
- **Actions**: `autocomplete` (predictions) and `details` (structured address)
- **Validation**: Zod discriminated union schema

## Common Tasks

### Adding a new map feature

1. Use `useGoogleMapsLoader` to get `isLoaded` state
2. Only render Google Maps components when `isLoaded === true`
3. Handle `loadError` and `keyError` gracefully with error boundaries

```tsx
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';

function MyMapFeature() {
  const { isLoaded, loadError, retry } = useGoogleMapsLoader();
  
  if (loadError) return <ErrorState onRetry={retry} />;
  if (!isLoaded) return <Skeleton />;
  
  return <GoogleMap /* ... */ />;
}
```

### Using the address picker

```tsx
import GooglePlacesAutocomplete, { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';

function AddressField() {
  const { isLoaded } = useGoogleMapsLoader();
  
  const handlePlaceSelect = (data: PlaceLocationData) => {
    // data.formatted_address, data.street, data.city, 
    // data.state, data.country, data.lat, data.lng
  };

  return (
    <GooglePlacesAutocomplete
      isLoaded={isLoaded}
      onPlaceSelect={handlePlaceSelect}
      placeholder="Enter address..."
    />
  );
}
```

### Geocoding an address server-side

Call the `geocode-location` edge function:

```ts
const { data, error } = await supabase.functions.invoke('geocode-location', {
  body: { organizationId: orgId, input: addressString }
});
// data: { lat, lng, formatted_address } or { lat: null, lng: null }
```

### Adding a new Edge Function that uses Google Maps

1. Use the `edge-function-creator` skill to scaffold the function
2. Read the server key: `Deno.env.get("GOOGLE_MAPS_SERVER_KEY")`
3. Always fall back to legacy names: `|| Deno.env.get("GOOGLE_MAPS_API_KEY")`
4. Never expose the server key in responses — only return processed data

## Debugging

### "Map Configuration Error" toast

The browser key fetch failed. Check:
1. `GOOGLE_MAPS_BROWSER_KEY` is set in Supabase Edge Function secrets
2. The `public-google-maps-key` function is deployed
3. The user is authenticated (JWT required)

### Places autocomplete not showing results

1. Check if web component mode failed (console: `AutocompletePlaces blocked`)
2. The component auto-falls-back to edge function mode
3. Verify `GOOGLE_MAPS_SERVER_KEY` is set in Supabase secrets
4. Check the `places-autocomplete` edge function logs

### Geocoding returns `{ lat: null, lng: null }`

1. Address may be unresolvable — check raw address string
2. Rate limit may be exceeded (30/min/org) — check for 429 responses
3. Verify `GOOGLE_MAPS_SERVER_KEY` is valid and has Geocoding API enabled

### Fleet map markers not appearing

1. Confirm `isLoaded` is true before rendering `<GoogleMap>`
2. Check that equipment has valid `lat`/`lng` coordinates
3. Verify the location source in `EquipmentLocation.source` field

## Google Cloud Console requirements

The project requires these APIs enabled:

| API | Used By |
|-----|---------|
| Maps JavaScript API | Fleet map, web component autocomplete |
| Places API | Web component autocomplete |
| Places API (Legacy) | `places-autocomplete` edge function |
| Geocoding API | `geocode-location` edge function |

Browser key restrictions should allow the app's domain(s). Server key should have no referrer restrictions (IP restrictions recommended).

## Key files

| File | Purpose |
|------|---------|
| `src/hooks/useGoogleMapsKey.ts` | Fetch browser API key from edge function |
| `src/hooks/useGoogleMapsLoader.ts` | Singleton Maps JS API loader |
| `src/components/ui/GooglePlacesAutocomplete.tsx` | Address picker component |
| `src/components/ui/ClickableAddress.tsx` | Address → Google Maps link |
| `src/features/fleet-map/components/MapView.tsx` | Fleet map with markers |
| `src/features/fleet-map/pages/FleetMap.tsx` | Fleet map page |
| `src/features/fleet-map/components/FleetMapErrorBoundary.tsx` | Map error boundary |
| `src/utils/effectiveLocation.ts` | Location resolution + Maps URL builder |
| `src/services/placesAutocompleteService.ts` | Edge function client for places |
| `supabase/functions/public-google-maps-key/index.ts` | Browser key edge function |
| `supabase/functions/geocode-location/index.ts` | Geocoding edge function |
| `supabase/functions/places-autocomplete/index.ts` | Places proxy edge function |
