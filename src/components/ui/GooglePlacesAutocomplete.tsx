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

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { createManualPlaceData } from '@/components/ui/google-places/googlePlacesParsing';
import { useGooglePlacesWebComponent } from '@/components/ui/google-places/useGooglePlacesWebComponent';
import { useGooglePlacesEdgeAutocomplete } from '@/components/ui/google-places/useGooglePlacesEdgeAutocomplete';
import { GooglePlacesEdgeAutocomplete } from '@/components/ui/google-places/GooglePlacesEdgeAutocomplete';
import { GooglePlacesPlaintextInput } from '@/components/ui/google-places/GooglePlacesPlaintextInput';
import { GooglePlacesLoadingInput } from '@/components/ui/google-places/GooglePlacesLoadingInput';
import type {
  GooglePlacesAutocompleteProps,
  GooglePlacesInitMode,
  PlaceLocationData,
} from '@/components/ui/google-places/googlePlacesTypes';

export type { PlaceLocationData, GooglePlacesAutocompleteProps };

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value = '',
  onPlaceSelect,
  onClear,
  placeholder = 'Search for an address...',
  disabled = false,
  className = '',
  isLoaded,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [mode, setMode] = useState<GooglePlacesInitMode>('pending');

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const { webContainerRef, handleClearCheck } = useGooglePlacesWebComponent({
    isLoaded,
    mode,
    placeholder,
    inputValue,
    onPlaceSelect,
    onInputValueChange: setInputValue,
    onModeChange: setMode,
  });

  const edgeAutocomplete = useGooglePlacesEdgeAutocomplete({
    onPlaceSelect,
    onClear,
  });

  const handleWebComponentBlur = useCallback(() => {
    if (onClear && handleClearCheck()) {
      onClear();
    }
  }, [onClear, handleClearCheck]);

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
    onPlaceSelect(createManualPlaceData(inputValue.trim()));
  }, [inputValue, onPlaceSelect]);

  if (!isLoaded) {
    return (
      <GooglePlacesLoadingInput
        className={className}
        inputValue={inputValue}
        placeholder={placeholder}
      />
    );
  }

  if (mode === 'pending' || mode === 'webcomponent') {
    return (
      <div className={cn('relative', className)}>
        <div
          ref={webContainerRef}
          onBlur={handleWebComponentBlur}
          className="gmp-autocomplete-container w-full"
        />
      </div>
    );
  }

  if (mode === 'edge') {
    return (
      <GooglePlacesEdgeAutocomplete
        className={className}
        inputValue={inputValue}
        placeholder={placeholder}
        disabled={disabled}
        fetchingDetails={edgeAutocomplete.fetchingDetails}
        predictions={edgeAutocomplete.predictions}
        showDropdown={edgeAutocomplete.showDropdown}
        highlightIndex={edgeAutocomplete.highlightIndex}
        onInputChange={(e) => edgeAutocomplete.handleInputChange(e.target.value, setInputValue)}
        onKeyDown={(e) => edgeAutocomplete.handleKeyDown(e, inputValue, setInputValue)}
        onFocus={edgeAutocomplete.openDropdownIfPredictions}
        onHighlightIndexChange={edgeAutocomplete.setHighlightIndex}
        onSelectPrediction={(prediction) => {
          void edgeAutocomplete.handleSelectPrediction(prediction, setInputValue);
        }}
        onCloseDropdown={edgeAutocomplete.closeDropdown}
      />
    );
  }

  return (
    <GooglePlacesPlaintextInput
      className={className}
      inputValue={inputValue}
      placeholder={placeholder}
      disabled={disabled}
      onChange={handlePlaintextChange}
      onBlur={handlePlaintextSubmit}
      onEnter={handlePlaintextSubmit}
    />
  );
};

export default GooglePlacesAutocomplete;
