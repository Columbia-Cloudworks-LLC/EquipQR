import { useMemo, useState } from 'react';
import { format as formatDate } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  createLedgerShortcutDate,
  getLocalDateInputValue,
  LEDGER_SINGLE_DATE_SHORTCUTS,
} from '@/features/operator-check-ins/utils/operatorCheckinLedgerScope';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export const LEDGER_DATE_START_ID = 'report-date-start';
export const LEDGER_DATE_END_ID = 'report-date-end';

interface OperatorCheckinLedgerDateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  className?: string;
}

function parseDateInput(value: string): Date | undefined {
  const [yyyy, mm, dd] = value.split('-').map(Number);
  if (!yyyy || !mm || !dd) return undefined;
  const date = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatSingleDateLabel(value: string): string {
  const date = parseDateInput(value);
  return date ? formatDate(date, 'MMM d, yyyy') : 'Select date';
}

const LEDGER_DATE_PICKER_CALENDAR_CLASS_NAMES = {
  months: 'flex w-full flex-col items-center',
  month: 'mx-auto grid w-full max-w-[20rem] grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-3',
  month_caption: 'col-start-2 row-start-1 flex items-center justify-center',
  caption_label: 'text-sm font-semibold',
  button_previous: cn(
    buttonVariants({ variant: 'outline' }),
    'col-start-1 row-start-1 h-10 w-10 shrink-0 p-0 opacity-100 hover:bg-accent touch-manipulation',
  ),
  button_next: cn(
    buttonVariants({ variant: 'outline' }),
    'col-start-3 row-start-1 h-10 w-10 shrink-0 p-0 opacity-100 hover:bg-accent touch-manipulation',
  ),
  month_grid: 'col-span-3 row-start-2 mx-auto w-full border-collapse',
  weekdays: 'flex justify-center',
  weekday: 'w-10 text-center text-xs font-normal text-muted-foreground',
  week: 'mt-2 flex justify-center',
  day: 'relative h-10 w-10 p-0 text-center text-sm [&:has([aria-selected])]:bg-accent',
  day_button: cn(
    buttonVariants({ variant: 'ghost' }),
    'h-10 w-10 p-0 font-normal aria-selected:opacity-100 touch-manipulation',
  ),
  selected:
    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
  today: 'bg-accent text-accent-foreground',
  outside: 'text-muted-foreground opacity-50',
};

const LEDGER_DATE_PICKER_CALENDAR_CLASS_NAMES_COMPACT = {
  ...LEDGER_DATE_PICKER_CALENDAR_CLASS_NAMES,
  month: 'mx-auto grid w-full max-w-[18rem] grid-cols-[auto_1fr_auto] items-center gap-x-1.5 gap-y-2',
  caption_label: 'text-sm font-medium',
  button_previous: cn(
    buttonVariants({ variant: 'outline' }),
    'col-start-1 row-start-1 h-8 w-8 shrink-0 p-0 opacity-100 hover:bg-accent',
  ),
  button_next: cn(
    buttonVariants({ variant: 'outline' }),
    'col-start-3 row-start-1 h-8 w-8 shrink-0 p-0 opacity-100 hover:bg-accent',
  ),
  weekday: 'w-9 text-center text-[11px] font-normal text-muted-foreground',
  week: 'mt-1 flex justify-center',
  day: 'relative h-9 w-9 p-0 text-center text-sm [&:has([aria-selected])]:bg-accent',
  day_button: cn(
    buttonVariants({ variant: 'ghost' }),
    'h-9 w-9 p-0 text-sm font-normal aria-selected:opacity-100',
  ),
};

type DatePickerDensity = 'compact' | 'comfortable';

interface DatePickerPanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onComplete: () => void;
  density?: DatePickerDensity;
}

function DatePickerPanel({
  label,
  value,
  onChange,
  onComplete,
  density = 'comfortable',
}: DatePickerPanelProps) {
  const selectedDate = parseDateInput(value);

  const activeShortcutId = useMemo(() => {
    return LEDGER_SINGLE_DATE_SHORTCUTS.find(
      (shortcut) => createLedgerShortcutDate(shortcut.daysAgo) === value,
    )?.id;
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(getLocalDateInputValue(date));
    onComplete();
  };

  const applyShortcut = (daysAgo: number) => {
    onChange(createLedgerShortcutDate(daysAgo));
    onComplete();
  };

  const isCompact = density === 'compact';

  return (
    <div className="flex flex-col">
      <div className={cn('border-b', isCompact ? 'px-3 py-2' : 'px-4 py-3')}>
        <p
          className={cn(
            'font-medium text-muted-foreground',
            isCompact ? 'mb-1 text-[11px]' : 'mb-2 text-xs',
          )}
        >
          Quick dates
        </p>
        <div className={cn(isCompact ? 'flex flex-wrap gap-1' : 'grid grid-cols-2 gap-2')}>
          {LEDGER_SINGLE_DATE_SHORTCUTS.map((shortcut) => {
            const isActive = activeShortcutId === shortcut.id;
            return (
              <Button
                key={shortcut.id}
                type="button"
                variant="outline"
                className={cn(
                  'justify-center font-normal',
                  isCompact
                    ? 'h-7 min-h-0 min-w-0 px-2 text-xs touch-manipulation'
                    : 'h-auto min-h-[44px] px-3 py-2.5 text-sm touch-manipulation',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                    : 'border-border/60 bg-muted/30 hover:bg-muted/60',
                  !isCompact && shortcut.id === '365d' && 'col-span-2',
                )}
                aria-label={shortcut.label}
                onClick={() => applyShortcut(shortcut.daysAgo)}
              >
                {shortcut.shortLabel}
              </Button>
            );
          })}
        </div>
      </div>
      <div className={cn('flex justify-center', isCompact ? 'px-2 pb-2 pt-1' : 'px-3 pb-4 pt-2')}>
        <Calendar
          navLayout="around"
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate}
          numberOfMonths={1}
          className="p-0"
          classNames={
            isCompact
              ? LEDGER_DATE_PICKER_CALENDAR_CLASS_NAMES_COMPACT
              : LEDGER_DATE_PICKER_CALENDAR_CLASS_NAMES
          }
          components={{
            Chevron: ({ orientation, ...rest }) =>
              orientation === 'left' ? (
                <ChevronLeft className={cn(isCompact ? 'h-4 w-4' : 'h-5 w-5')} {...rest} />
              ) : (
                <ChevronRight className={cn(isCompact ? 'h-4 w-4' : 'h-5 w-5')} {...rest} />
              ),
          }}
          aria-label={`${label} calendar`}
        />
      </div>
    </div>
  );
}

interface SingleDateCalendarFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function SingleDateCalendarField({
  id,
  label,
  value,
  onChange,
}: SingleDateCalendarFieldProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const closePicker = () => setOpen(false);

  const triggerButton = (
    <Button
      id={id}
      type="button"
      variant="outline"
      className="h-11 min-h-[44px] w-full justify-between font-normal touch-manipulation"
      aria-label={label}
      aria-expanded={open}
      onClick={isMobile ? () => setOpen(true) : undefined}
    >
      <span className="flex min-w-0 items-center gap-2">
        <CalendarIcon className="shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{formatSingleDateLabel(value)}</span>
      </span>
      <ChevronDown className="shrink-0 text-muted-foreground" aria-hidden />
    </Button>
  );

  const panelProps = {
    label,
    value,
    onChange,
    onComplete: closePicker,
  };

  if (isMobile) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        {triggerButton}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            reserveMobileBottomNav
            className="inset-x-0 !bottom-[var(--mobile-bottom-nav-height)] max-h-[min(85dvh,calc(100dvh-var(--mobile-bottom-nav-height)-1rem))] overflow-y-auto rounded-t-xl p-0"
          >
            <SheetHeader className="border-b px-4 py-3 text-left">
              <SheetTitle className="text-base font-medium">{label}</SheetTitle>
            </SheetHeader>
            <DatePickerPanel {...panelProps} density="comfortable" />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          collisionPadding={16}
          className="w-[min(calc(100vw-1rem),18.5rem)] p-0"
        >
          <DatePickerPanel {...panelProps} density="compact" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function OperatorCheckinLedgerDateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}: OperatorCheckinLedgerDateRangePickerProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} data-testid="ledger-date-range-picker">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SingleDateCalendarField
          id={LEDGER_DATE_START_ID}
          label="Start date"
          value={startDate}
          onChange={onStartDateChange}
        />
        <SingleDateCalendarField
          id={LEDGER_DATE_END_ID}
          label="End date"
          value={endDate}
          onChange={onEndDateChange}
        />
      </div>
    </div>
  );
}
