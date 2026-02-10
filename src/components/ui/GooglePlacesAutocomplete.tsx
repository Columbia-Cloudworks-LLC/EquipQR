/**
 * GooglePlacesAutocomplete – single-input address picker.
 *
 * Strategy (ordered by preference):
 * 1. Try the Google Maps `PlaceAutocompleteElement` web component.
 * 2. If the web component fails (e.g. Maps API not fully authorized),
 *    fall back to our `places-autocomplete` edge function which proxies
 *    Google's Places REST API server-side.
 * 3. If both fail, render a plain text input.
 *
 * Requires the Google Maps JS API to be loaded with the "places"
 * library – use the shared `useGoogleMapsLoader` hook.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchPredictions as fetchPredictionsFromEdge,
  fetchPlaceDetails as fetchPlaceDetailsFromEdge,
} from '@/services/placesAutocompleteService';
import type { Prediction } from '@/services/placesAutocompleteService';

// ----------------------------------------------------------------
// Public types
// ----------------------------------------------------------------

export interface PlaceLocationData {
  formatted_address: string;
  street: string;
  city: string;
  state: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

export interface GooglePlacesAutocompleteProps {
  /** Current display value (formatted address string) */
  value?: string;
  /** Called when the user picks a place from the dropdown */
  onPlaceSelect: (data: PlaceLocationData) => void;
  /** Called when the user clears the input */
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Whether the Google Maps JS API is loaded */
  isLoaded: boolean;
}

// ----------------------------------------------------------------
// Helpers – new Places API (addressComponents)
// ----------------------------------------------------------------

function parseNewPlaceResult(place: google.maps.places.Place): PlaceLocationData {
  const comps = place.addressComponents;
  const get = (type: string) =>
    comps?.find((c: google.maps.places.AddressComponent) => c.types.includes(type));

  const streetNumber = get('street_number')?.longText ?? '';
  const route = get('route')?.longText ?? '';

  return {
    formatted_address: place.formattedAddress ?? '',
    street: [streetNumber, route].filter(Boolean).join(' '),
    city: get('locality')?.longText ?? get('sublocality')?.longText ?? '',
    state: get('administrative_area_level_1')?.shortText ?? '',
    country: get('country')?.longText ?? '',
    lat: place.location?.lat() ?? null,
    lng: place.location?.lng() ?? null,
  };
}

const NEW_PLACE_FIELDS: Array<keyof google.maps.places.Place> = [
  'addressComponents',
  'formattedAddress',
  'location',
];

/** Debounce delay for edge function predictions (ms) */
const DEBOUNCE_MS = 300;

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

type InitMode = 'pending' | 'webcomponent' | 'edge' | 'plaintext';

/**
 * Check if a console.error call is the Google Maps "AutocompletePlaces blocked"
 * message, indicating the Places API (New) is not enabled for the current key.
 */
function isPlacesApiBlockedError(args: unknown[]): boolean {
  const msg = args.map((a) => (typeof a === 'string' ? a : String(a ?? ''))).join(' ');
  return msg.includes('AutocompletePlaces') && (msg.includes('blocked') || msg.includes('403'));
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value = '',
  onPlaceSelect,
  onClear,
  placeholder = 'Search for an address...',
  disabled = false,
  className = '',
  isLoaded,
}) => {
  // ── Core state ──────────────────────────────────────────────
  const [inputValue, setInputValue] = useState(value);
  const [mode, setMode] = useState<InitMode>('pending');

  // ── Web component refs ──────────────────────────────────────
  const webContainerRef = useRef<HTMLDivElement>(null);
  const webComponentRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);

  // ── Edge function autocomplete state ────────────────────────
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Keep a ref to the latest onPlaceSelect
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  // Keep inputValue in sync if parent changes value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // ── Initialization: try web component first ─────────────────
  // We use `mode` as a dependency so this re-runs after the first
  // render when the container div becomes available.
  useEffect(() => {
    if (!isLoaded) return;

    // Web component already mounted — nothing to do
    if (webComponentRef.current) return;

    // Only attempt web component when the container is available
    // (it renders when mode is 'pending' or 'webcomponent')
    if (webContainerRef.current && google.maps.places.PlaceAutocompleteElement) {
      try {
        const el = new google.maps.places.PlaceAutocompleteElement({});
        el.setAttribute('placeholder', placeholder);

        const handleSelect = async (event: Event) => {
          try {
            // The event shape varies by Google Maps API version:
            // - Older: `gmp-placeselect` with event.place
            // - Newer: `gmp-select` with event.place or minified property
            const anyEvent = event as Record<string, unknown>;
            let place: google.maps.places.Place | undefined;

            // Try typed API first
            if ('place' in anyEvent && anyEvent.place) {
              place = anyEvent.place as google.maps.places.Place;
            }

            // Try placePrediction (older docs pattern)
            if (!place && 'placePrediction' in anyEvent) {
              const pred = anyEvent.placePrediction as { toPlace?: () => google.maps.places.Place };
              if (pred?.toPlace) {
                place = pred.toPlace();
              }
            }

            // Fallback: scan for any Place-like object in event properties
            if (!place) {
              for (const key of Object.keys(anyEvent)) {
                const val = anyEvent[key];
                if (val && typeof val === 'object' && 'fetchFields' in (val as object)) {
                  place = val as google.maps.places.Place;
                  break;
                }
              }
            }

            if (!place) {
              console.error('[GooglePlacesAutocomplete] Could not extract place from event');
              return;
            }

            await place.fetchFields({ fields: NEW_PLACE_FIELDS as string[] });
            const data = parseNewPlaceResult(place);
            setInputValue(data.formatted_address);
            onPlaceSelectRef.current(data);
          } catch (error) {
            console.error('[GooglePlacesAutocomplete] Error handling place selection:', error);
          }
        };

        // Listen for both event names (Google renamed the event in newer API versions)
        el.addEventListener('gmp-placeselect', handleSelect);
        el.addEventListener('gmp-select', handleSelect);
        webContainerRef.current.appendChild(el);
        webComponentRef.current = el;
        setMode('webcomponent');

        // ── Runtime 403 detection ────────────────────────────
        // The web component mounts successfully but its internal API
        // calls may fail at runtime if the Places API (New) is not
        // enabled for the browser key. Google's JS API logs these
        // errors via console.error. We intercept them to detect the
        // failure and auto-fall-back to the edge function proxy.
        //
        // Safety: we only restore console.error if it is still the
        // handler we installed, preventing interference when other
        // code (e.g. monitoring tools) replaces it in the meantime.
        const origConsoleError = console.error;
        let apiErrorDetected = false;

        /** Restore console.error only if it's still our handler. */
        const safeRestore = () => {
          if (console.error === detectPlacesError) {
            console.error = origConsoleError;
          }
        };

        function detectPlacesError(...args: unknown[]) {
          origConsoleError.apply(console, args);
          if (apiErrorDetected) return;
          if (isPlacesApiBlockedError(args)) {
            apiErrorDetected = true;
            safeRestore();
            // Tear down the broken web component and switch to edge mode
            el.removeEventListener('gmp-placeselect', handleSelect);
            el.removeEventListener('gmp-select', handleSelect);
            el.remove();
            webComponentRef.current = null;
            setMode('edge');
          }
        }
        console.error = detectPlacesError;

        // Safety net: restore console.error after 5 seconds even if
        // no Places API error is detected (web component is working fine).
        // Reduced from 30s — if the API is blocked, the error fires
        // within the first few seconds.
        const restoreTimer = setTimeout(() => {
          if (!apiErrorDetected) {
            safeRestore();
          }
        }, 5_000);

        return () => {
          if (!apiErrorDetected) {
            safeRestore();
          }
          clearTimeout(restoreTimer);
          el.removeEventListener('gmp-placeselect', handleSelect);
          el.removeEventListener('gmp-select', handleSelect);
          el.remove();
          webComponentRef.current = null;
        };
      } catch {
        // Web component failed – fall through to edge function
        setMode('edge');
      }
    } else if (mode === 'pending') {
      // Container not yet available or PlaceAutocompleteElement missing —
      // fall back to edge function mode
      setMode('edge');
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, mode]);

  // ── Web component: sync inputValue into the rendered input ──
  // The PlaceAutocompleteElement renders its own internal <input>.
  // We need to keep it in sync when `value` (→ inputValue) changes
  // externally (e.g. edit flows pre-filling an address, or clears).
  useEffect(() => {
    if (mode !== 'webcomponent') return;
    const el = webComponentRef.current;
    if (!el) return;

    // Try the public `.value` accessor first (if the API supports it)
    if ('value' in el) {
      try {
        (el as unknown as { value: string }).value = inputValue;
        return;
      } catch {
        // Accessor may be read-only; fall through to shadow DOM
      }
    }

    // Fallback: reach into the shadow DOM to set the inner input value
    const innerInput =
      el.shadowRoot?.querySelector('input') ??
      el.querySelector('input');
    if (innerInput && innerInput.value !== inputValue) {
      innerInput.value = inputValue;
    }
  }, [mode, inputValue]);

  // ── Edge function: fetch predictions ────────────────────────
  const fetchPredictions = useCallback((input: string) => {
    if (!input.trim() || input.trim().length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await fetchPredictionsFromEdge(
          input.trim(),
          sessionTokenRef.current,
        );

        if (results.length > 0) {
          setPredictions(results);
          setShowDropdown(true);
          setHighlightIndex(-1);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
      } catch {
        setPredictions([]);
        setShowDropdown(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  // ── Edge function: select a prediction ──────────────────────
  const handleSelectPrediction = useCallback(
    async (prediction: Prediction) => {
      setInputValue(prediction.description);
      setShowDropdown(false);
      setPredictions([]);
      setFetchingDetails(true);

      try {
        const data = await fetchPlaceDetailsFromEdge(
          prediction.place_id,
          sessionTokenRef.current,
        );

        if (data) {
          setInputValue(data.formatted_address);
          onPlaceSelectRef.current(data);
        } else {
          onPlaceSelectRef.current({
            formatted_address: prediction.description,
            street: '',
            city: '',
            state: '',
            country: '',
            lat: null,
            lng: null,
          });
        }
      } catch {
        onPlaceSelectRef.current({
          formatted_address: prediction.description,
          street: '',
          city: '',
          state: '',
          country: '',
          lat: null,
          lng: null,
        });
      } finally {
        setFetchingDetails(false);
        sessionTokenRef.current = crypto.randomUUID();
      }
    },
    [],
  );

  // ── Edge mode: input change handler ─────────────────────────
  const handleEdgeInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setInputValue(v);
      if (v === '') {
        setPredictions([]);
        setShowDropdown(false);
        if (onClear) onClear();
      } else {
        fetchPredictions(v);
      }
    },
    [onClear, fetchPredictions],
  );

  // ── Edge mode: keyboard navigation ──────────────────────────
  const handleEdgeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || predictions.length === 0) {
        if (e.key === 'Enter' && inputValue.trim()) {
          onPlaceSelectRef.current({
            formatted_address: inputValue.trim(),
            street: '',
            city: '',
            state: '',
            country: '',
            lat: null,
            lng: null,
          });
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < predictions.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : predictions.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < predictions.length) {
            handleSelectPrediction(predictions[highlightIndex]);
          }
          break;
        case 'Escape':
          setShowDropdown(false);
          setHighlightIndex(-1);
          break;
      }
    },
    [showDropdown, predictions, highlightIndex, handleSelectPrediction, inputValue],
  );

  // ── Close dropdown on click outside ─────────────────────────
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // ── Web component: clear check ──────────────────────────────
  const handleClearCheck = useCallback(() => {
    if (onClear) {
      const input = webComponentRef.current?.querySelector('input') ??
        webContainerRef.current?.querySelector('input');
      if (input && input.value === '') {
        onClear();
      }
    }
  }, [onClear]);

  // ── Plain text fallback handlers ────────────────────────────
  const handlePlaintextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setInputValue(v);
      if (v === '' && onClear) onClear();
    },
    [onClear],
  );

  const handlePlaintextSubmit = useCallback(() => {
    if (!inputValue.trim()) return;
    onPlaceSelect({
      formatted_address: inputValue.trim(),
      street: '',
      city: '',
      state: '',
      country: '',
      lat: null,
      lng: null,
    });
  }, [inputValue, onPlaceSelect]);

  // ── Render ──────────────────────────────────────────────────

  // Loading: API not yet ready
  if (!isLoaded) {
    return (
      <div className={cn('relative', className)}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          placeholder={placeholder}
          disabled
          className="pl-9"
        />
      </div>
    );
  }

  // Pending or webcomponent: show the container div so the web
  // component can mount into it. The container is always present
  // during 'pending' so the init effect can find it.
  // Note: no MapPin icon here — the PlaceAutocompleteElement has
  // its own built-in search icon.
  if (mode === 'pending' || mode === 'webcomponent') {
    return (
      <div className={cn('relative', className)}>
        <div
          ref={webContainerRef}
          onBlur={handleClearCheck}
          className="gmp-autocomplete-container w-full"
        />
      </div>
    );
  }

  // Edge function mode: custom dropdown
  if (mode === 'edge') {
    return (
      <div className={cn('relative', className)}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        {fetchingDetails && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleEdgeInputChange}
          onKeyDown={handleEdgeKeyDown}
          onFocus={() => {
            if (predictions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9"
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {showDropdown && predictions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md"
            role="listbox"
          >
            <ul className="max-h-60 overflow-auto py-1">
              {predictions.map((prediction, index) => (
                <li
                  key={prediction.place_id}
                  role="option"
                  aria-selected={index === highlightIndex}
                  className={cn(
                    'cursor-pointer select-none px-3 py-2 text-sm transition-colors',
                    index === highlightIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'text-popover-foreground hover:bg-accent/50',
                  )}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectPrediction(prediction);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {prediction.structured_formatting.main_text}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {prediction.structured_formatting.secondary_text}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground/60 text-right">
              Powered by Google
            </div>
          </div>
        )}
      </div>
    );
  }

  // Plain text fallback
  return (
    <div className={cn('relative', className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        value={inputValue}
        onChange={handlePlaintextChange}
        onBlur={handlePlaintextSubmit}
        onKeyDown={(e) => { if (e.key === 'Enter') handlePlaintextSubmit(); }}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-9"
        autoFocus
      />
    </div>
  );
};

export default GooglePlacesAutocomplete;
