/**
 * AuditLogTimeRangePicker — segmented control for the audit explorer's time
 * range. Emits ISO-precision timestamps so the histogram and list queries
 * agree on the same boundary even at sub-day granularity (issue #641).
 */

import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuditLogTimePreset } from '@/types/audit';

const PRESET_BUTTONS: Array<{ value: Exclude<AuditLogTimePreset, 'custom'>; label: string }> = [
  { value: 'last_15m', label: '15m' },
  { value: 'last_1h', label: '1h' },
  { value: 'last_24h', label: '24h' },
  { value: 'last_7d', label: '7d' },
  { value: 'last_30d', label: '30d' },
];

export interface AuditLogTimeRangePickerProps {
  preset: AuditLogTimePreset;
  /** ISO timestamp; only meaningful when preset === 'custom'. */
  isoFrom?: string;
  /** ISO timestamp; only meaningful when preset === 'custom'. */
  isoTo?: string;
  onChange: (preset: AuditLogTimePreset, isoFrom?: string, isoTo?: string) => void;
}

function isoToDateInput(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatDate(d, 'yyyy-MM-dd');
}

function dateInputToIso(value: string, endOfDay: boolean): string {
  // Treat the YYYY-MM-DD value as a local-time boundary so the user gets
  // the calendar day they selected. Convert to ISO for the API.
  const [yyyy, mm, dd] = value.split('-').map(Number);
  if (!yyyy || !mm || !dd) return '';
  const local = new Date(
    yyyy,
    mm - 1,
    dd,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );
  return local.toISOString();
}

export function AuditLogTimeRangePicker({
  preset,
  isoFrom,
  isoTo,
  onChange,
}: AuditLogTimeRangePickerProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(() => isoToDateInput(isoFrom));
  const [draftTo, setDraftTo] = useState(() => isoToDateInput(isoTo));

  useEffect(() => {
    setDraftFrom(isoToDateInput(isoFrom));
    setDraftTo(isoToDateInput(isoTo));
  }, [isoFrom, isoTo, popoverOpen]);

  const customLabel =
    preset === 'custom' && isoFrom && isoTo
      ? `${formatDate(new Date(isoFrom), 'MMM d')} – ${formatDate(new Date(isoTo), 'MMM d')}`
      : 'Custom';

  return (
    <div className="flex items-center gap-1.5">
      <ToggleGroup
        type="single"
        size="sm"
        value={preset === 'custom' ? '' : preset}
        onValueChange={(v) => {
          if (!v) return;
          onChange(v as AuditLogTimePreset);
        }}
        aria-label="Time range preset"
      >
        {PRESET_BUTTONS.map((btn) => (
          <ToggleGroupItem
            key={btn.value}
            value={btn.value}
            className="h-7 px-2 text-xs"
            aria-label={`Last ${btn.label}`}
          >
            {btn.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={preset === 'custom' ? 'default' : 'outline'}
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            aria-label="Custom date range"
          >
            <Calendar className="h-3 w-3" />
            {customLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Custom range
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="h-8 text-xs"
                  aria-label="Custom range start date"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="h-8 text-xs"
                  aria-label="Custom range end date"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPopoverOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!draftFrom || !draftTo}
                onClick={() => {
                  const fromIso = dateInputToIso(draftFrom, false);
                  const toIso = dateInputToIso(draftTo, true);
                  if (!fromIso || !toIso) return;
                  onChange('custom', fromIso, toIso);
                  setPopoverOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default AuditLogTimeRangePicker;
