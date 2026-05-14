
import { useEffect, useState, useRef } from 'react';

interface PageVisibilityOptions {
  onVisibilityChange?: (isVisible: boolean) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  debounceMs?: number;
}

export const usePageVisibility = (options: PageVisibilityOptions = {}) => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [isFocused, setIsFocused] = useState(document.hasFocus());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { onVisibilityChange, onFocus, onBlur, debounceMs = 100 } = options;

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      if (debounceMs > 0) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          onVisibilityChange?.(visible);
        }, debounceMs);
      } else {
        onVisibilityChange?.(visible);
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
      if (debounceMs > 0) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          onFocus?.();
        }, debounceMs);
      } else {
        onFocus?.();
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      onBlur?.();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [onVisibilityChange, onFocus, onBlur, debounceMs]);

  return { isVisible, isFocused };
};
