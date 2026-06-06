import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';
import { EQUIPMENT_SORT_OPTIONS } from '@/features/equipment/components/equipmentSortOptions';

type EquipmentSortSelectProps = {
  compositeValue: string;
  onValueChange: (value: string) => void;
  triggerClassName?: string;
};

export function EquipmentSortSelect({
  compositeValue,
  onValueChange,
  triggerClassName = 'w-[200px]',
}: EquipmentSortSelectProps) {
  return (
    <Select value={compositeValue} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName} aria-label="Sort equipment">
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {EQUIPMENT_SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
