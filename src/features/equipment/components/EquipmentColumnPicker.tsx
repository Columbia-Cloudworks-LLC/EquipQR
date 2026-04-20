import React from 'react';
import { Columns3, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { EquipmentTableColumnMeta } from './EquipmentTable';

export interface EquipmentColumnPickerProps {
  allColumns: readonly EquipmentTableColumnMeta[];
  visibleColumns: Record<string, boolean>;
  onToggle: (key: string) => void;
  onReset: () => void;
  hasOverrides: boolean;
}

/**
 * Toolbar control that lets a user show or hide columns in the dense
 * `EquipmentTable` view (Issue #633). Choices are persisted per-org by the
 * `useEquipmentTableColumns` hook; this component is purely presentational.
 *
 * Columns flagged `canHide: false` (currently just `name`, the row identifier
 * and the frozen first column) render as disabled checkbox items so the user
 * can see they exist but cannot turn them off.
 */
export const EquipmentColumnPicker: React.FC<EquipmentColumnPickerProps> = ({
  allColumns,
  visibleColumns,
  onToggle,
  onReset,
  hasOverrides,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          aria-label="Toggle columns"
        >
          <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allColumns.map((col) => {
          const checked = visibleColumns[col.key] ?? true;
          return (
            <DropdownMenuCheckboxItem
              key={col.key}
              checked={checked}
              disabled={!col.canHide}
              onCheckedChange={() => onToggle(col.key)}
              onSelect={(e) => {
                // Prevent the menu from closing on every toggle so the user
                // can flip several columns in a row.
                e.preventDefault();
              }}
            >
              {col.title}
            </DropdownMenuCheckboxItem>
          );
        })}
        {hasOverrides && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onReset()}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Reset to defaults
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EquipmentColumnPicker;
