import React from 'react';
import { cn } from '@/lib/utils';
import {
  WORK_ORDER_SYMPTOM_CHIPS,
  type WorkOrderSymptomChip,
} from '@/features/work-orders/utils/symptomChips';

interface WorkOrderSymptomChipsProps {
  title: string;
  onSelect: (chip: WorkOrderSymptomChip) => void;
  disabled?: boolean;
}

/** One-tap common symptoms / tasks that fill or extend the work order title. */
export const WorkOrderSymptomChips: React.FC<WorkOrderSymptomChipsProps> = ({
  title,
  onSelect,
  disabled = false,
}) => {
  const lowerTitle = title.toLowerCase();

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick-fill title">
      {WORK_ORDER_SYMPTOM_CHIPS.map((chip) => {
        const isUsed = lowerTitle.includes(chip.toLowerCase());
        return (
          <button
            key={chip}
            type="button"
            disabled={disabled}
            aria-pressed={isUsed}
            onClick={() => onSelect(chip)}
            className={cn(
              'touch-manipulation rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              'disabled:pointer-events-none disabled:opacity-50',
              isUsed
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
};
