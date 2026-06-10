import { useRef, useEffect, useCallback, type RefObject } from 'react';
import {
  addGooglePlacesErrorListener,
  isPlacesApiBlockedError,
  removeGooglePlacesErrorListener,
} from '@/components/ui/google-places/googlePlacesConsoleError';
import { NEW_PLACE_FIELDS, parseNewPlaceResult } from '@/components/ui/google-places/googlePlacesParsing';
import type { GooglePlacesInitMode, PlaceLocationData } from '@/components/ui/google-places/googlePlacesTypes';

type UseGooglePlacesWebComponentOptions = {
  isLoaded: boolean;
  mode: GooglePlacesInitMode;
  placeholder: string;
  inputValue: string;
  onPlaceSelect: (data: PlaceLocationData) => void;
  onInputValueChange: (value: string) => void;
  onModeChange: (mode: GooglePlacesInitMode) => void;
};

type UseGooglePlacesWebComponentResult = {
  webContainerRef: RefObject<HTMLDivElement>;
  handleClearCheck: () => boolean;
};

export function useGooglePlacesWebComponent({
  isLoaded,
  mode,
  placeholder,
  inputValue,
  onPlaceSelect,
  onInputValueChange,
  onModeChange,
}: UseGooglePlacesWebComponentOptions): UseGooglePlacesWebComponentResult {
  const webContainerRef = useRef<HTMLDivElement>(null);
  const webComponentRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    if (!isLoaded) return;
    if (webComponentRef.current) return;

    if (webContainerRef.current && google.maps.places.PlaceAutocompleteElement) {
      try {
        const el = new google.maps.places.PlaceAutocompleteElement({});
        el.setAttribute('placeholder', placeholder);

        const handleSelect = async (event: Event) => {
          try {
            const anyEvent = event as unknown as Record<string, unknown>;
            let place: google.maps.places.Place | undefined;

            if ('place' in anyEvent && anyEvent.place) {
              place = anyEvent.place as google.maps.places.Place;
            }

            if (!place && 'placePrediction' in anyEvent) {
              const pred = anyEvent.placePrediction as { toPlace?: () => google.maps.places.Place };
              if (pred?.toPlace) {
                place = pred.toPlace();
              }
            }

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
            onInputValueChange(data.formatted_address);
            onPlaceSelectRef.current(data);
          } catch (error) {
            console.error('[GooglePlacesAutocomplete] Error handling place selection:', error);
          }
        };

        el.addEventListener('gmp-placeselect', handleSelect);
        el.addEventListener('gmp-select', handleSelect);
        webContainerRef.current.appendChild(el);
        webComponentRef.current = el;
        onModeChange('webcomponent');

        let apiErrorDetected = false;

        const onConsoleError = (...args: unknown[]) => {
          if (apiErrorDetected) return;
          if (isPlacesApiBlockedError(args)) {
            apiErrorDetected = true;
            removeGooglePlacesErrorListener(onConsoleError);
            el.removeEventListener('gmp-placeselect', handleSelect);
            el.removeEventListener('gmp-select', handleSelect);
            el.remove();
            webComponentRef.current = null;
            onModeChange('edge');
          }
        };

        addGooglePlacesErrorListener(onConsoleError);

        const restoreTimer = setTimeout(() => {
          if (!apiErrorDetected) {
            removeGooglePlacesErrorListener(onConsoleError);
          }
        }, 5_000);

        return () => {
          removeGooglePlacesErrorListener(onConsoleError);
          clearTimeout(restoreTimer);
          el.removeEventListener('gmp-placeselect', handleSelect);
          el.removeEventListener('gmp-select', handleSelect);
          el.remove();
          webComponentRef.current = null;
        };
      } catch {
        onModeChange('edge');
      }
    } else if (mode === 'pending') {
      onModeChange('edge');
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, mode]);

  useEffect(() => {
    if (mode !== 'webcomponent') return;
    const el = webComponentRef.current;
    if (!el) return;

    if ('value' in el) {
      try {
        (el as unknown as { value: string }).value = inputValue;
        return;
      } catch {
        // Accessor may be read-only; fall through to shadow DOM
      }
    }

    const innerInput =
      el.shadowRoot?.querySelector('input') ??
      el.querySelector('input');
    if (innerInput && innerInput.value !== inputValue) {
      innerInput.value = inputValue;
    }
  }, [mode, inputValue]);

  const handleClearCheck = useCallback(() => {
    const input = webComponentRef.current?.querySelector('input') ??
      webContainerRef.current?.querySelector('input');
    if (input && input.value === '') {
      return true;
    }
    return false;
  }, []);

  return { webContainerRef, handleClearCheck };
}
