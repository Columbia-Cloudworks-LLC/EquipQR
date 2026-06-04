import React from 'react';
import { Building, MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EQUIPMENT_STATUS_FILTER_VALUES } from '@/features/equipment/components/equipmentFilterConstants';

export type EquipmentStatusSelectLabels = {
  all: string;
  active: string;
  maintenance: string;
  inactive: string;
  out_of_service: string;
};

const DEFAULT_STATUS_LABELS: EquipmentStatusSelectLabels = {
  all: 'All Status',
  active: 'Active',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
  out_of_service: 'Out of Service',
};

type EquipmentStatusSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  triggerId?: string;
  triggerClassName?: string;
  labels?: EquipmentStatusSelectLabels;
  leadingIcon?: React.ReactNode;
};

export function EquipmentStatusSelect({
  value,
  onValueChange,
  placeholder,
  ariaLabel = 'Filter by status',
  triggerId,
  triggerClassName,
  labels = DEFAULT_STATUS_LABELS,
  leadingIcon,
}: EquipmentStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id={triggerId}
        className={triggerClassName}
        aria-label={ariaLabel}
      >
        {leadingIcon}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {EQUIPMENT_STATUS_FILTER_VALUES.map((statusValue) => (
          <SelectItem key={statusValue} value={statusValue}>
            {labels[statusValue]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type EquipmentManufacturerSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  manufacturers: string[];
  placeholder?: string;
  ariaLabel?: string;
  triggerId?: string;
  triggerClassName?: string;
  allLabel?: string;
  showIcon?: boolean;
};

export function EquipmentManufacturerSelect({
  value,
  onValueChange,
  manufacturers,
  placeholder = 'Manufacturer',
  ariaLabel = 'Manufacturer',
  triggerId,
  triggerClassName,
  allLabel = 'All Manufacturers',
  showIcon = false,
}: EquipmentManufacturerSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id={triggerId}
        className={triggerClassName}
        aria-label={ariaLabel}
      >
        {showIcon ? (
          <Building className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
        ) : (
          <Building className="h-4 w-4 mr-2" />
        )}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {manufacturers.map((manufacturer) => (
          <SelectItem key={manufacturer} value={manufacturer}>
            {manufacturer}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type EquipmentLocationSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  locations: string[];
  placeholder?: string;
  ariaLabel?: string;
  triggerId?: string;
  triggerClassName?: string;
  allLabel?: string;
  showIcon?: boolean;
};

export function EquipmentLocationSelect({
  value,
  onValueChange,
  locations,
  placeholder = 'Location',
  ariaLabel = 'Location',
  triggerId,
  triggerClassName,
  allLabel = 'All Locations',
  showIcon = false,
}: EquipmentLocationSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id={triggerId}
        className={triggerClassName}
        aria-label={ariaLabel}
      >
        {showIcon ? (
          <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
        ) : (
          <MapPin className="h-4 w-4 mr-2" />
        )}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {locations.map((location) => (
          <SelectItem key={location} value={location}>
            {location}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
