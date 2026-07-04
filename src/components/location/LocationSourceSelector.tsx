import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EFFECTIVE_LOCATION_OPTION_LABEL,
  getLocationSelectorChoices,
} from '@/components/location/locationSourceSelectorChoices';
import type { EquipmentLocationOption, LocationDisplayMode } from '@/utils/effectiveLocation';

type LocationSourceSelectorProps = {
  value: LocationDisplayMode;
  onChange: (mode: LocationDisplayMode) => void;
  options: EquipmentLocationOption[];
  id?: string;
  className?: string;
};

export function LocationSourceSelector({
  value,
  onChange,
  options,
  id = 'location-source-selector',
  className,
}: LocationSourceSelectorProps) {
  const choices = getLocationSelectorChoices(options);

  return (
    <div className={className}>
      <Label htmlFor={id} className="sr-only">
        Location source
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as LocationDisplayMode)}>
        <SelectTrigger id={id} aria-label="Location source" className="h-8 text-xs">
          <SelectValue placeholder={EFFECTIVE_LOCATION_OPTION_LABEL} />
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => (
            <SelectItem key={choice.value} value={choice.value} disabled={choice.disabled}>
              {choice.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
