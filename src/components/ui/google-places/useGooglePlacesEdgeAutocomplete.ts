import { useRef, useState, useCallback, useEffect } from 'react';
import {
  fetchPredictions as fetchPredictionsFromEdge,
  fetchPlaceDetails as fetchPlaceDetailsFromEdge,
} from '@/services/placesAutocompleteService';
import type { Prediction } from '@/services/placesAutocompleteService';
import { createManualPlaceData } from '@/components/ui/google-places/googlePlacesParsing';
import type { PlaceLocationData } from '@/components/ui/google-places/googlePlacesTypes';

const DEBOUNCE_MS = 300;

type UseGooglePlacesEdgeAutocompleteOptions = {
  onPlaceSelect: (data: PlaceLocationData) => void;
  onClear?: () => void;
};

export function useGooglePlacesEdgeAutocomplete({
  onPlaceSelect,
  onClear,
}: UseGooglePlacesEdgeAutocompleteOptions) {
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

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

  const handleSelectPrediction = useCallback(
    async (prediction: Prediction, setInputValue: (value: string) => void) => {
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
          onPlaceSelectRef.current(createManualPlaceData(prediction.description));
        }
      } catch {
        onPlaceSelectRef.current(createManualPlaceData(prediction.description));
      } finally {
        setFetchingDetails(false);
        sessionTokenRef.current = crypto.randomUUID();
      }
    },
    [],
  );

  const handleInputChange = useCallback(
    (value: string, setInputValue: (value: string) => void) => {
      setInputValue(value);
      if (value === '') {
        setPredictions([]);
        setShowDropdown(false);
        if (onClear) onClear();
      } else {
        fetchPredictions(value);
      }
    },
    [onClear, fetchPredictions],
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      inputValue: string,
      setInputValue: (value: string) => void,
    ) => {
      if (!showDropdown || predictions.length === 0) {
        if (e.key === 'Enter' && inputValue.trim()) {
          onPlaceSelectRef.current(createManualPlaceData(inputValue.trim()));
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
            void handleSelectPrediction(predictions[highlightIndex], setInputValue);
          }
          break;
        case 'Escape':
          setShowDropdown(false);
          setHighlightIndex(-1);
          break;
      }
    },
    [showDropdown, predictions, highlightIndex, handleSelectPrediction],
  );

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
    setHighlightIndex(-1);
  }, []);

  const openDropdownIfPredictions = useCallback(() => {
    if (predictions.length > 0) setShowDropdown(true);
  }, [predictions.length]);

  return {
    predictions,
    showDropdown,
    highlightIndex,
    fetchingDetails,
    setHighlightIndex,
    handleSelectPrediction,
    handleInputChange,
    handleKeyDown,
    closeDropdown,
    openDropdownIfPredictions,
  };
}
