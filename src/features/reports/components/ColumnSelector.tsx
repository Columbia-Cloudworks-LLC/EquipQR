import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw } from 'lucide-react';
import type { ExportColumn, ReportType } from '@/features/reports/types/reports';

// Storage key prefix for column preferences
const COLUMN_PREFS_KEY = 'equipqr_export_columns_';

/**
 * Get saved column preferences from localStorage
 */
export function getSavedColumnPreferences(reportType: ReportType): string[] | null {
  try {
    const saved = localStorage.getItem(`${COLUMN_PREFS_KEY}${reportType}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

/**
 * Save column preferences to localStorage
 */
export function saveColumnPreferences(reportType: ReportType, columns: string[]): void {
  try {
    localStorage.setItem(`${COLUMN_PREFS_KEY}${reportType}`, JSON.stringify(columns));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear saved column preferences for a report type
 */
export function clearColumnPreferences(reportType: ReportType): void {
  try {
    localStorage.removeItem(`${COLUMN_PREFS_KEY}${reportType}`);
  } catch {
    // Ignore localStorage errors
  }
}

interface ColumnSelectorProps {
  availableColumns: ExportColumn[];
  selectedColumns: string[];
  onChange: (columns: string[]) => void;
  onResetToDefaults?: () => void;
  hasSavedPreferences?: boolean;
}

/**
 * ColumnSelector - Allows users to select which columns to include in an export
 * 
 * Features:
 * - Checkbox list of available columns
 * - Select All / Deselect All buttons
 * - Visual indication of selected count
 * - Saved preferences indicator
 */
export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  availableColumns,
  selectedColumns,
  onChange,
  onResetToDefaults,
  hasSavedPreferences = false,
}) => {
  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedColumns, columnKey]);
    } else {
      onChange(selectedColumns.filter(key => key !== columnKey));
    }
  };

  const handleSelectAll = () => {
    onChange(availableColumns.map(col => col.key));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const allSelected = selectedColumns.length === availableColumns.length;
  const noneSelected = selectedColumns.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedColumns.length} of {availableColumns.length} columns selected
          </span>
          {hasSavedPreferences && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Saved preferences
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {hasSavedPreferences && onResetToDefaults && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetToDefaults}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={allSelected}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={noneSelected}
          >
            Deselect All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {availableColumns.map((column) => {
          const isSelected = selectedColumns.includes(column.key);
          
          return (
            <div key={column.key} className="flex items-center space-x-2">
              <Checkbox
                id={`column-${column.key}`}
                checked={isSelected}
                onCheckedChange={(checked) => 
                  handleColumnToggle(column.key, checked === true)
                }
              />
              <Label
                htmlFor={`column-${column.key}`}
                className="text-sm font-normal cursor-pointer"
              >
                {column.label}
              </Label>
            </div>
          );
        })}
      </div>

      {noneSelected && (
        <p className="text-sm text-destructive">
          Please select at least one column to export.
        </p>
      )}
    </div>
  );
};

export default ColumnSelector;
