import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export type SegmentedPillTone = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';

export interface SegmentedPillOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Accessible name when the visible label is abbreviated or an icon. */
  ariaLabel?: string;
  /** Color applied while this option is selected. */
  tone?: SegmentedPillTone;
  disabled?: boolean;
}

const ACTIVE_TONE_CLASSES: Record<SegmentedPillTone, string> = {
  neutral:
    'data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=on]:ring-1 data-[state=on]:ring-border',
  primary:
    'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm',
  success:
    'data-[state=on]:bg-success/15 data-[state=on]:text-success data-[state=on]:ring-1 data-[state=on]:ring-success/40',
  warning:
    'data-[state=on]:bg-warning/15 data-[state=on]:text-warning data-[state=on]:ring-1 data-[state=on]:ring-warning/40',
  destructive:
    'data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive data-[state=on]:ring-1 data-[state=on]:ring-destructive/40',
  info: 'data-[state=on]:bg-info/15 data-[state=on]:text-info data-[state=on]:ring-1 data-[state=on]:ring-info/40',
};

const SIZE_CLASSES = {
  /** Dense rows (checklists, table cells). */
  sm: 'h-7 min-w-9 px-2 text-xs',
  /** Dense on desktop, thumb-sized on phones where the control gets its own line. */
  dense: 'h-9 min-w-12 px-3 text-xs sm:h-7 sm:min-w-9 sm:px-2',
  /** Forms on desktop. */
  md: 'h-9 px-3 text-sm',
  /** Thumb-zone controls on phones. */
  lg: 'h-11 px-4 text-sm',
} as const;

export interface SegmentedPillsProps<T extends string> {
  value: T | null | undefined;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<SegmentedPillOption<T>>;
  /** Names the group for assistive tech. */
  ariaLabel: string;
  size?: keyof typeof SIZE_CLASSES;
  /** Stretch options to share the full width equally. */
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Single-tap segmented control for small option sets (2–5 choices).
 * Replaces a dropdown where every option fits on one row, so picking a value
 * is one tap instead of open → scan → select.
 */
export function SegmentedPills<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  size = 'md',
  fullWidth = false,
  disabled = false,
  className,
  id,
}: SegmentedPillsProps<T>) {
  return (
    <ToggleGroup
      id={id}
      type="single"
      value={value ?? ''}
      // Radix emits '' when the active item is tapped again; a segmented
      // control always keeps one selection, so ignore the deselect.
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        'inline-flex justify-start gap-0.5 rounded-lg bg-muted/60 p-0.5',
        fullWidth && 'flex w-full',
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.ariaLabel}
          disabled={option.disabled}
          className={cn(
            'touch-manipulation whitespace-nowrap rounded-md font-medium text-muted-foreground hover:bg-background/70 hover:text-foreground',
            SIZE_CLASSES[size],
            ACTIVE_TONE_CLASSES[option.tone ?? 'neutral'],
            fullWidth && 'flex-1',
          )}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
