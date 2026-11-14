import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileQuickFilterChipsProps<T extends string> {
  presets: ReadonlyArray<{ value: T; label: string }>;
  isActive: (value: T) => boolean;
  onSelect: (value: T) => void;
}

/** "Quick filters" chip row at the top of a mobile filter sheet. */
export function MobileQuickFilterChips<T extends string>({
  presets,
  isActive,
  onSelect,
}: MobileQuickFilterChipsProps<T>) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Quick filters</h3>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const active = isActive(preset.value);
          return (
            <Button
              key={preset.value}
              size="sm"
              variant={active ? 'default' : 'outline'}
              className="min-h-11 whitespace-nowrap"
              onClick={() => onSelect(preset.value)}
            >
              {active && <Check className="mr-1 h-3 w-3" aria-hidden />}
              {preset.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
