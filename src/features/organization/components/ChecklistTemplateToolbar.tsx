import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChecklistTemplateToolbarProps = {
  isPageLayout: boolean;
  sectionCount: number;
  totalItemCount: number;
  previewMode: boolean;
  isLargeTemplate: boolean;
  focusSectionMode: boolean;
  onPreviewModeChange: (checked: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onEnableFocusSectionMode: () => void;
  onOpenAddSection: () => void;
};

export function ChecklistTemplateToolbar({
  isPageLayout,
  sectionCount,
  totalItemCount,
  previewMode,
  isLargeTemplate,
  focusSectionMode,
  onPreviewModeChange,
  onExpandAll,
  onCollapseAll,
  onEnableFocusSectionMode,
  onOpenAddSection,
}: ChecklistTemplateToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/95 backdrop-blur p-3 mb-4',
        isPageLayout && 'sticky top-0 z-10'
      )}
    >
      <div className="text-sm text-muted-foreground">
        {sectionCount} section{sectionCount !== 1 ? 's' : ''} · {totalItemCount} item
        {totalItemCount !== 1 ? 's' : ''}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Preview</span>
          <Switch checked={previewMode} onCheckedChange={onPreviewModeChange} />
        </div>
        {isLargeTemplate && (
          <Button
            size="sm"
            variant="outline"
            onClick={focusSectionMode ? onExpandAll : onEnableFocusSectionMode}
          >
            {focusSectionMode ? 'Show all sections' : 'Focus section'}
          </Button>
        )}
        {!focusSectionMode && (
          <>
            <Button size="sm" variant="ghost" onClick={onExpandAll} className="hidden md:inline-flex">
              Expand all
            </Button>
            <Button size="sm" variant="ghost" onClick={onCollapseAll} className="hidden md:inline-flex">
              Collapse all
            </Button>
          </>
        )}
        <Button onClick={onOpenAddSection} size="sm">
          <Plus className="mr-1 h-3 w-3" />
          Add Section
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" aria-label="Keyboard shortcuts">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-sm" align="end">
            <p className="font-medium mb-2">Keyboard shortcuts</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <kbd className="px-1 rounded bg-muted">Enter</kbd> — add item below
              </li>
              <li>
                <kbd className="px-1 rounded bg-muted">Esc</kbd> — collapse row
              </li>
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
