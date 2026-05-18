import { useState, useEffect, useRef } from 'react';

interface UseInputDebounceOptions {
  delay?: number;
  onDebouncedChange?: (value: string) => void;
}

export const useInputDebounce = (
  initialValue: string = '', 
  { delay = 8000, onDebouncedChange }: UseInputDebounceOptions = {}
) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      onDebouncedChange?.(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, onDebouncedChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    value,
    setValue,
    debouncedValue,
    isDebouncing: value !== debouncedValue
  };
};