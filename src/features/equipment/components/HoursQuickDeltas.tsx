import React from 'react';
import { cn } from '@/lib/utils';
import { applyHoursDelta } from '@/features/equipment/utils/hoursDelta';

const DEFAULT_DELTAS = [4, 8, 10] as const;

interface HoursQuickDeltasProps {
  /** Text currently in the hours input. */
  value: string;
  /** The machine's current recorded hours, used when the input is empty. */
  currentHours: number | null | undefined;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  deltas?: ReadonlyArray<number>;
  className?: string;
}

/** One-tap `+4h / +8h / +10h` pills for meter updates after a shift. */
export const HoursQuickDeltas: React.FC<HoursQuickDeltasProps> = ({
  value,
  currentHours,
  onChange,
  disabled = false,
  deltas = DEFAULT_DELTAS,
  className,
}) => (
  <div className={cn('flex flex-wrap gap-1.5', className)} role="group" aria-label="Add hours">
    {deltas.map((delta) => (
      <button
        key={delta}
        type="button"
        disabled={disabled}
        aria-label={`Add ${delta} hours`}
        onClick={() => onChange(applyHoursDelta(value, currentHours, delta))}
        className={cn(
          'touch-manipulation rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors',
          'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        +{delta}h
      </button>
    ))}
  </div>
);
