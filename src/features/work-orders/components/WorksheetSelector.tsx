import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ALL_WORKSHEET_KEYS,
  WORKSHEET_NAMES,
  type WorksheetKey,
} from '@/features/work-orders/types/workOrderExcel';

interface WorksheetSelectorProps {
  selectedWorksheets: WorksheetKey[];
  onChange: (worksheets: WorksheetKey[]) => void;
  className?: string;
}

/**
 * Collapsible worksheet picker for the Internal Work Order Packet export card.
 * Collapsed by default; all worksheets selected on first load.
 */
export const WorksheetSelector: React.FC<WorksheetSelectorProps> = ({
  selectedWorksheets,
  onChange,
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (key: WorksheetKey, checked: boolean) => {
    if (checked) {
      onChange([...selectedWorksheets, key]);
      return;
    }
    onChange(selectedWorksheets.filter((worksheet) => worksheet !== key));
  };

  const noneSelected = selectedWorksheets.length === 0;

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
                Worksheets to export
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedWorksheets.length} of {ALL_WORKSHEET_KEYS.length} selected
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
              {ALL_WORKSHEET_KEYS.map((key) => {
                const isSelected = selectedWorksheets.includes(key);
                const inputId = `worksheet-${key}`;

                return (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={inputId}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleToggle(key, checked === true)}
                    />
                    <Label htmlFor={inputId} className="cursor-pointer text-xs font-normal">
                      {WORKSHEET_NAMES[key]}
                    </Label>
                  </div>
                );
              })}
            </div>

            {noneSelected && (
              <p className="text-xs text-destructive">Select at least one worksheet to export.</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export function worksheetNamesForKeys(keys: WorksheetKey[]): string[] {
  return keys.map((key) => WORKSHEET_NAMES[key]);
}
