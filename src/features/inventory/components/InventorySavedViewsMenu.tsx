import { useState } from 'react';
import { Bookmark, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { INVENTORY_BUILT_IN_VIEWS } from '@/features/inventory/constants/inventoryListBuiltInViews';
import type { InventorySavedView } from '@/features/inventory/types/inventory';

type InventorySavedViewsMenuProps = {
  savedViews: InventorySavedView[];
  activeViewId?: string;
  onApplyView: (view: InventorySavedView) => void;
  onSaveCurrentView: (name: string) => void;
  onDeleteView: (viewId: string) => void;
};

export function InventorySavedViewsMenu({
  savedViews,
  activeViewId,
  onApplyView,
  onSaveCurrentView,
  onDeleteView,
}: InventorySavedViewsMenuProps) {
  const [newViewName, setNewViewName] = useState('');

  const allViews = [...INVENTORY_BUILT_IN_VIEWS, ...savedViews];
  const activeView = allViews.find((v) => v.id === activeViewId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          aria-label="Saved views"
        >
          <Bookmark className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline max-w-[120px] truncate">
            {activeView?.name ?? 'Views'}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Built-in views
        </DropdownMenuLabel>
        {INVENTORY_BUILT_IN_VIEWS.map((view) => (
          <DropdownMenuItem
            key={view.id}
            onSelect={() => onApplyView(view)}
            className={activeViewId === view.id ? 'bg-muted' : undefined}
          >
            {view.name}
          </DropdownMenuItem>
        ))}

        {savedViews.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Your views
            </DropdownMenuLabel>
            {savedViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onSelect={() => onApplyView(view)}
                className="flex items-center justify-between gap-2"
              >
                <span className={activeViewId === view.id ? 'font-medium' : undefined}>
                  {view.name}
                </span>
                <button
                  type="button"
                  className="rounded-sm p-1 hover:bg-muted"
                  aria-label={`Delete view ${view.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteView(view.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <div className="p-2 space-y-2">
          <Input
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            placeholder="Save current view as..."
            className="h-8 text-sm"
            aria-label="New saved view name"
          />
          <Button
            type="button"
            size="sm"
            className="w-full h-8"
            disabled={!newViewName.trim()}
            onClick={() => {
              onSaveCurrentView(newViewName.trim());
              setNewViewName('');
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            Save view
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
