import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import type {
  EquipmentMediaFiltersState,
  EquipmentMediaSortField,
  EquipmentMediaSortOrder,
  EquipmentMediaSourceFilter,
} from '@/features/equipment/utils/equipmentMediaFilters';
import type { EquipmentMediaFilterHandlers } from '@/features/equipment/components/media/equipmentMediaFilterHandlers';

interface EquipmentMediaFiltersProps extends EquipmentMediaFilterHandlers {
  filters: EquipmentMediaFiltersState;
  activeFilterCount: number;
  onClear: () => void;
}

export function EquipmentMediaFiltersBar({
  filters,
  activeFilterCount,
  onSearchChange,
  onSourceChange,
  onUploaderChange,
  onDateFromChange,
  onDateToChange,
  onSortChange,
  onClear,
}: EquipmentMediaFiltersProps) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-2 sm:p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="relative min-w-0 flex-1">
          <Label htmlFor="equipment-media-search" className="sr-only">
            Search media
          </Label>
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="equipment-media-search"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search file, note, uploader…"
            className="h-8 pl-8 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="equipment-media-source" className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Source
            </Label>
            <Select
              value={filters.source}
              onValueChange={(value) => onSourceChange(value as EquipmentMediaSourceFilter)}
            >
              <SelectTrigger id="equipment-media-source" className="h-8 w-full sm:w-[9.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="equipment_note">Equipment notes</SelectItem>
                <SelectItem value="work_order_note">Work orders</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="equipment-media-sort" className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Sort
            </Label>
            <Select
              value={`${filters.sortField}:${filters.sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split(':') as [
                  EquipmentMediaSortField,
                  EquipmentMediaSortOrder,
                ];
                onSortChange(field, order);
              }}
            >
              <SelectTrigger id="equipment-media-sort" className="h-8 w-full sm:w-[11rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at:desc">Newest first</SelectItem>
                <SelectItem value="created_at:asc">Oldest first</SelectItem>
                <SelectItem value="source:asc">Source A–Z</SelectItem>
                <SelectItem value="uploader:asc">Uploader A–Z</SelectItem>
                <SelectItem value="file_name:asc">File name A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="equipment-media-uploader" className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Uploader
          </Label>
          <Input
            id="equipment-media-uploader"
            value={filters.uploader}
            onChange={(e) => onUploaderChange(e.target.value)}
            placeholder="Name or user…"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="equipment-media-from" className="text-[10px] uppercase tracking-wide text-muted-foreground">
            From
          </Label>
          <Input
            id="equipment-media-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="equipment-media-to" className="text-[10px] uppercase tracking-wide text-muted-foreground">
            To
          </Label>
          <Input
            id="equipment-media-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <p className="text-xs text-muted-foreground">
            {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
          </p>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>
            <X className="mr-1 h-3 w-3" aria-hidden />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
