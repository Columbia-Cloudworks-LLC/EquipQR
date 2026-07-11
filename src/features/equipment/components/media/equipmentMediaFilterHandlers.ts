import type {
  EquipmentMediaSortField,
  EquipmentMediaSortOrder,
  EquipmentMediaSourceFilter,
} from '@/features/equipment/utils/equipmentMediaFilters';

/** Shared filter control callbacks for media library toolbar + explorer. */
export interface EquipmentMediaFilterHandlers {
  onSearchChange: (value: string) => void;
  onSourceChange: (value: EquipmentMediaSourceFilter) => void;
  onUploaderChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSortChange: (field: EquipmentMediaSortField, order: EquipmentMediaSortOrder) => void;
}
