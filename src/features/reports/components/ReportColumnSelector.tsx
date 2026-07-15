import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getColumnsForReportType } from '@/features/reports/constants/reportColumns';
import type { ReportType } from '@/features/reports/types/reports';

interface ReportColumnSelectorProps {
  reportType: ReportType;
  selectedColumns: string[];
  onChange: (columns: string[]) => void;
  className?: string;
}

/**
 * Collapsible column picker for CSV export cards on the Reports page.
 * Collapsed by default; default columns selected on first load.
 */
export const ReportColumnSelector: React.FC<ReportColumnSelectorProps> = ({
  reportType,
  selectedColumns,
  onChange,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const availableColumns = getColumnsForReportType(reportType);

  const handleToggle = (columnKey: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedColumns, columnKey]);
      return;
    }
    onChange(selectedColumns.filter((key) => key !== columnKey));
  };

  const noneSelected = selectedColumns.length === 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <div className="border border-border/60 bg-muted/20">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-muted/30"
            aria-expanded={open}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Fields to export
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedColumns.length} of {availableColumns.length} selected
              </p>
            </div>
            {open ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availableColumns.map((column) => {
                const isSelected = selectedColumns.includes(column.key);
                const inputId = `column-${reportType}-${column.key}`;

                return (
                  <div key={column.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={inputId}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleToggle(column.key, checked === true)}
                    />
                    <Label htmlFor={inputId} className="cursor-pointer text-xs font-normal">
                      {column.label}
                    </Label>
                  </div>
                );
              })}
            </div>

            {noneSelected && (
              <p className="text-xs text-destructive">Select at least one field to export.</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
