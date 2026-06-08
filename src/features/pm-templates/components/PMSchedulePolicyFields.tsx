import React, { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { PMIntervalType, PMSchedulePolicyFormState } from '@/features/pm-templates/services/pmIntervalPolicyService';

type PMSchedulePolicyFieldsProps = {
  value: PMSchedulePolicyFormState;
  onChange: (next: PMSchedulePolicyFormState) => void;
  inheritLabel?: string;
  intervalError?: string | null;
  disabled?: boolean;
  /** Omit card chrome when embedded in an inline equipment field editor. */
  compact?: boolean;
};

export function PMSchedulePolicyFields({
  value,
  onChange,
  inheritLabel = 'Inherit schedule',
  intervalError,
  disabled = false,
  compact = false,
}: PMSchedulePolicyFieldsProps) {
  const idBase = useId();
  const inheritId = `${idBase}-inherit`;
  const customId = `${idBase}-custom`;
  const noneId = `${idBase}-none`;
  const intervalValueId = `${idBase}-interval-value`;
  const daysId = `${idBase}-days`;
  const hoursId = `${idBase}-hours`;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-3 rounded-md border p-4'}>
      {!compact && (
        <div>
          <Label className="text-sm font-medium">PM Schedule</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Control when equipment should be flagged for recurring preventive maintenance.
          </p>
        </div>
      )}

      <RadioGroup
        value={value.mode}
        onValueChange={(mode) =>
          onChange({
            ...value,
            mode: mode as PMSchedulePolicyFormState['mode'],
          })
        }
        className="space-y-2"
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="inherit" id={inheritId} />
          <Label htmlFor={inheritId} className="font-normal cursor-pointer">
            {inheritLabel}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="custom" id={customId} />
          <Label htmlFor={customId} className="font-normal cursor-pointer">
            Custom interval
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="none" id={noneId} />
          <Label htmlFor={noneId} className="font-normal cursor-pointer">
            No recurring PM
          </Label>
        </div>
      </RadioGroup>

      {value.mode === 'custom' && (
        <div className="flex flex-wrap items-end gap-4 pt-1">
          <div className="flex-1 max-w-[200px]">
            <Label htmlFor={intervalValueId} className="text-xs">
              Every
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={intervalValueId}
                type="number"
                min={1}
                value={value.intervalValue ?? ''}
                onChange={(e) => {
                  const parsed = e.target.value ? parseInt(e.target.value, 10) : null;
                  onChange({ ...value, intervalValue: parsed });
                }}
                placeholder="e.g. 90"
                className={intervalError ? 'border-destructive' : ''}
                disabled={disabled}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {value.intervalType === 'hours' ? 'Working Hours' : 'Calendar Days'}
              </span>
            </div>
            {intervalError && <p className="text-xs text-destructive mt-1">{intervalError}</p>}
          </div>
          <RadioGroup
            value={value.intervalType}
            onValueChange={(val) => onChange({ ...value, intervalType: val as PMIntervalType })}
            className="flex gap-4 pb-1"
            disabled={disabled}
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="days" id={daysId} />
              <Label htmlFor={daysId} className="text-sm font-normal cursor-pointer">
                Calendar Days
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="hours" id={hoursId} />
              <Label htmlFor={hoursId} className="text-sm font-normal cursor-pointer">
                Working Hours
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
