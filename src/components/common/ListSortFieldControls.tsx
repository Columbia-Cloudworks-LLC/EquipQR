import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ListSortFieldKind } from '@/components/common/listSortFieldKind';
import { getListSortOrderLabel } from '@/components/common/listSortOrderLabel';
import { ListSortOrderIcon } from '@/components/common/listSortOrderIcon';

export type ListSortFieldOption = {
  value: string;
  label: string;
  kind?: ListSortFieldKind;
};

export interface ListSortFieldControlsProps {
  sortField: string;
  sortOrder: 'asc' | 'desc';
  options: ListSortFieldOption[];
  onFieldChange: (field: string) => void;
  onOrderToggle: () => void;
  fieldSelectAriaLabel: string;
  selectTriggerId?: string;
}

function resolveFieldKind(
  options: ListSortFieldOption[],
  sortField: string,
): ListSortFieldKind {
  return options.find((option) => option.value === sortField)?.kind ?? 'default';
}

export const ListSortFieldControls: React.FC<ListSortFieldControlsProps> = ({
  sortField,
  sortOrder,
  options,
  onFieldChange,
  onOrderToggle,
  fieldSelectAriaLabel,
  selectTriggerId,
}) => {
  const fieldKind = resolveFieldKind(options, sortField);

  return (
    <div className="flex gap-2">
      <Select value={sortField} onValueChange={onFieldChange}>
        <SelectTrigger
          id={selectTriggerId}
          className="h-11 flex-1"
          aria-label={fieldSelectAriaLabel}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 shrink-0 touch-manipulation"
        onClick={onOrderToggle}
        aria-label={getListSortOrderLabel(fieldKind, sortOrder)}
      >
        <ListSortOrderIcon kind={fieldKind} sortOrder={sortOrder} />
      </Button>
    </div>
  );
};
