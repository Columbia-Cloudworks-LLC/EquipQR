import { useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Prediction } from '@/services/placesAutocompleteService';

type GooglePlacesEdgeAutocompleteProps = {
  className?: string;
  inputValue: string;
  placeholder: string;
  disabled: boolean;
  fetchingDetails: boolean;
  predictions: Prediction[];
  showDropdown: boolean;
  highlightIndex: number;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onHighlightIndexChange: (index: number) => void;
  onSelectPrediction: (prediction: Prediction) => void;
  onCloseDropdown: () => void;
};

export function GooglePlacesEdgeAutocomplete({
  className,
  inputValue,
  placeholder,
  disabled,
  fetchingDetails,
  predictions,
  showDropdown,
  highlightIndex,
  onInputChange,
  onKeyDown,
  onFocus,
  onHighlightIndexChange,
  onSelectPrediction,
  onCloseDropdown,
}: GooglePlacesEdgeAutocompleteProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        onCloseDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown, onCloseDropdown]);

  return (
    <div className={cn('relative', className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      {fetchingDetails && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
      )}
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
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
                onMouseEnter={() => onHighlightIndexChange(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectPrediction(prediction);
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
