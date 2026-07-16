import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export type ExportPickerItem = {
  key: string;
  label: string;
};

type ExportCollapsibleCheckboxPickerProps = {
  title: string;
  items: ExportPickerItem[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  noneSelectedMessage: string;
  idPrefix: string;
  className?: string;
};

export function ExportCollapsibleCheckboxPicker({
  title,
  items,
  selectedKeys,
  onChange,
  noneSelectedMessage,
  idPrefix,
  className,
}: ExportCollapsibleCheckboxPickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (key: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedKeys, key]);
      return;
    }
    onChange(selectedKeys.filter((selectedKey) => selectedKey !== key));
  };

  const noneSelected = selectedKeys.length === 0;

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
                {title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedKeys.length} of {items.length} selected
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
              {items.map((item) => {
                const isSelected = selectedKeys.includes(item.key);
                const inputId = `${idPrefix}-${item.key}`;

                return (
                  <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={inputId}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleToggle(item.key, checked === true)}
                    />
                    <Label htmlFor={inputId} className="cursor-pointer text-xs font-normal">
                      {item.label}
                    </Label>
                  </div>
                );
              })}
            </div>

            {noneSelected && <p className="text-xs text-destructive">{noneSelectedMessage}</p>}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
