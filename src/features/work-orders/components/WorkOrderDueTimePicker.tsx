import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type DueTimePeriod = 'AM' | 'PM';

export interface ParsedDueTimeParts {
  readonly hour12: string;
  readonly minute: string;
  readonly period: DueTimePeriod;
}

const HOURS_12 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;
const BASE_MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'] as const;
const PERIODS: readonly DueTimePeriod[] = ['AM', 'PM'];

const TIME_24H_PATTERN = /^(\d{2}):(\d{2})$/;
const DEFAULT_HOUR_12 = '9';
const DEFAULT_MINUTE = '00';
const DEFAULT_PERIOD: DueTimePeriod = 'AM';

export function parseDueTimeValue(value: string): ParsedDueTimeParts | null {
  const match = TIME_24H_PATTERN.exec(value.trim());
  if (!match) return null;

  const hours24 = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours24) ||
    !Number.isInteger(minutes) ||
    hours24 < 0 ||
    hours24 > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const period: DueTimePeriod = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = String(hours24 % 12 === 0 ? 12 : hours24 % 12);
  const minute = String(minutes).padStart(2, '0');

  return { hour12, minute, period };
}

export function formatDueTimeParts(
  hour12: string,
  minute: string,
  period: DueTimePeriod,
): string {
  const parsedHour = Number(hour12);
  const parsedMinute = Number(minute);
  const normalizedHour12 =
    Number.isInteger(parsedHour) && parsedHour >= 1 && parsedHour <= 12 ? parsedHour : 9;
  const normalizedMinute =
    Number.isInteger(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59 ? parsedMinute : 0;

  const hours24 =
    period === 'AM'
      ? normalizedHour12 === 12
        ? 0
        : normalizedHour12
      : normalizedHour12 === 12
        ? 12
        : normalizedHour12 + 12;

  return `${String(hours24).padStart(2, '0')}:${String(normalizedMinute).padStart(2, '0')}`;
}

export interface WorkOrderDueTimePickerProps {
  idPrefix?: string;
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  className?: string;
}

export const WorkOrderDueTimePicker: React.FC<WorkOrderDueTimePickerProps> = ({
  idPrefix = 'work-order-due-time',
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const parsed = parseDueTimeValue(value);

  const minuteOptions = React.useMemo(() => {
    if (!parsed || BASE_MINUTES.includes(parsed.minute as (typeof BASE_MINUTES)[number])) {
      return [...BASE_MINUTES];
    }
    return [...BASE_MINUTES, parsed.minute].sort((a, b) => Number(a) - Number(b));
  }, [parsed]);

  const handleHourChange = (nextHour: string) => {
    onChange(
      formatDueTimeParts(
        nextHour,
        parsed?.minute ?? DEFAULT_MINUTE,
        parsed?.period ?? DEFAULT_PERIOD,
      ),
    );
  };

  const handleMinuteChange = (nextMinute: string) => {
    onChange(
      formatDueTimeParts(
        parsed?.hour12 ?? DEFAULT_HOUR_12,
        nextMinute,
        parsed?.period ?? DEFAULT_PERIOD,
      ),
    );
  };

  const handlePeriodChange = (nextPeriod: string) => {
    const period: DueTimePeriod = nextPeriod === 'PM' ? 'PM' : 'AM';
    onChange(
      formatDueTimeParts(
        parsed?.hour12 ?? DEFAULT_HOUR_12,
        parsed?.minute ?? DEFAULT_MINUTE,
        period,
      ),
    );
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Select
          value={parsed?.hour12 ?? ''}
          onValueChange={handleHourChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={`${idPrefix}-hour`}
            aria-label="Due hour"
            className="min-w-0 flex-1 px-2.5 touch-manipulation"
          >
            <SelectValue placeholder="Hour" />
          </SelectTrigger>
          <SelectContent className="min-w-[4.5rem]">
            {HOURS_12.map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="select-none font-medium text-muted-foreground" aria-hidden>
          :
        </span>

        <Select
          value={parsed?.minute ?? ''}
          onValueChange={handleMinuteChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={`${idPrefix}-minute`}
            aria-label="Due minute"
            className="min-w-0 flex-1 px-2.5 touch-manipulation"
          >
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent className="min-w-[4.5rem]">
            {minuteOptions.map((minute) => (
              <SelectItem key={minute} value={minute}>
                {minute}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={parsed?.period ?? ''}
          onValueChange={handlePeriodChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={`${idPrefix}-period`}
            aria-label="Due period"
            className="min-w-0 flex-1 px-2.5 touch-manipulation"
          >
            <SelectValue placeholder="AM/PM" />
          </SelectTrigger>
          <SelectContent className="min-w-[4.5rem]">
            {PERIODS.map((period) => (
              <SelectItem key={period} value={period}>
                {period}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {parsed ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange('')}
          disabled={disabled}
          aria-label="Clear due time"
          className="h-11 min-h-11 shrink-0 px-2.5 text-muted-foreground hover:text-foreground touch-manipulation"
        >
          <X className="mr-1 h-4 w-4" aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  );
};
