import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  applyDueWrite,
  dueDateTimeInputWrite,
  dueDayInputValue,
  dueDayInputWrite,
  dueTimeInputValue,
  parseCalendarDay,
  parseDue,
  persistDue,
  todayLocal,
  type DueDate,
} from '@/features/work-orders/calendar';
import { WorkOrderDueTimePicker } from '@/features/work-orders/components/WorkOrderDueTimePicker';
import { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import { cn } from '@/lib/utils';

/** Time applied when the user taps "Add time" on an all-day due date. */
const DEFAULT_DUE_TIME = '09:00';

/** One-tap due dates, as days from today. */
const DUE_DATE_PRESETS: ReadonlyArray<{ label: string; ariaLabel: string; days: number }> = [
  { label: 'Today', ariaLabel: 'Due today', days: 0 },
  { label: 'Tomorrow', ariaLabel: 'Due tomorrow', days: 1 },
  { label: '+3d', ariaLabel: 'Due in 3 days', days: 3 },
  { label: 'Next Week', ariaLabel: 'Due in one week', days: 7 },
];

/** `yyyy-mm-dd` for the local calendar day `days` after today. */
function dueDatePresetValue(days: number, now: Date = new Date()): string {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${day.getFullYear()}-${month}-${date}`;
}

interface WorkOrderSchedulingProps {
  values: Pick<WorkOrderFormData, 'dueDate' | 'dueDateHasTime' | 'estimatedHours'>;
  errors: Partial<Record<'dueDate' | 'estimatedHours', string>>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
  /** Log Completed replaces the due date with the service date. */
  hideDueDate?: boolean;
}

export const WorkOrderScheduling: React.FC<WorkOrderSchedulingProps> = ({
  values,
  errors,
  setValue,
  hideDueDate = false,
}) => {
  const propDue = React.useMemo(
    () =>
      parseDue({
        dueDate: values.dueDate,
        dueDateHasTime: values.dueDateHasTime ?? false,
      }),
    [values.dueDate, values.dueDateHasTime],
  );
  const [draftDue, setDraftDue] = React.useState<DueDate>(propDue);
  const draftDueRef = React.useRef<DueDate>(propDue);

  React.useEffect(() => {
    draftDueRef.current = propDue;
    setDraftDue(propDue);
  }, [propDue]);

  const due = draftDue;
  const hasDueTime = dueTimeInputValue(due) !== '';

  const persistWrite = (write: Parameters<typeof applyDueWrite>[1]) => {
    const nextDue = applyDueWrite(draftDueRef.current, write);
    draftDueRef.current = nextDue;
    setDraftDue(nextDue);
    const persisted = persistDue(nextDue);
    setValue('dueDate', persisted.dueDate ?? undefined);
    setValue('dueDateHasTime', persisted.dueDateHasTime);
  };

  const handleDueTimeChange = (raw: string) => {
    if (raw === '') {
      persistWrite(dueDateTimeInputWrite(null));
      return;
    }

    const day = parseCalendarDay(dueDayInputValue(draftDueRef.current)) ?? todayLocal();

    const [hours, minutes] = raw.split(':').map(Number);
    persistWrite(dueDateTimeInputWrite({
      epochMs: new Date(day.y, day.m - 1, day.d, hours, minutes, 0, 0).getTime(),
    }));
  };

  const handleEstimatedHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setValue('estimatedHours', null);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 10000) {
        setValue('estimatedHours', numValue);
      }
    }
  };

  return (
    <div className="space-y-4">
        {!hideDueDate && (
        <div className="space-y-2">
          <Label htmlFor="work-order-due-date">Complete by</Label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Due date presets">
            {DUE_DATE_PRESETS.map((preset) => {
              const presetValue = dueDatePresetValue(preset.days);
              const isActive = dueDayInputValue(due) === presetValue;
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-label={preset.ariaLabel}
                  aria-pressed={isActive}
                  onClick={() => persistWrite(dueDayInputWrite(draftDueRef.current, presetValue))}
                  className={cn(
                    'touch-manipulation rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    isActive
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <Input
            id="work-order-due-date"
            type="date"
            value={dueDayInputValue(due)}
            onChange={(e) => persistWrite(dueDayInputWrite(draftDueRef.current, e.target.value))}
          />
          {errors.dueDate && (
            <p className="text-sm text-destructive">{errors.dueDate}</p>
          )}
          {hasDueTime ? (
            <WorkOrderDueTimePicker
              idPrefix="work-order-due-time"
              value={dueTimeInputValue(due)}
              onChange={handleDueTimeChange}
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>All day</span>
              <span aria-hidden>·</span>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => handleDueTimeChange(DEFAULT_DUE_TIME)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                Add time
              </Button>
            </div>
          )}
        </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="work-order-estimated-hours">Estimated time</Label>
          <div className="relative">
            <Input
              id="work-order-estimated-hours"
              type="number"
              inputMode="decimal"
              min="0"
              max="10000"
              step="0.5"
              placeholder="2.5"
              className="pr-12"
              value={values.estimatedHours != null ? values.estimatedHours.toString() : ''}
              onChange={handleEstimatedHoursChange}
            />
            <span
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
              aria-hidden
            >
              hrs
            </span>
          </div>
          {errors.estimatedHours && (
            <p className="text-sm text-destructive">{errors.estimatedHours}</p>
          )}
        </div>
    </div>
  );
};
