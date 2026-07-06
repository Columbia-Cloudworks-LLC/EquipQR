import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface MultiSelectActionOption {
  id: string;
  label: string;
  sublabel?: string;
  /** Extra text matched by the search box in addition to label/sublabel. */
  searchText?: string;
  /**
   * When set, the row renders checked and disabled with this badge text —
   * used for records that already have the assignment/grant.
   */
  lockedNote?: string;
}

interface MultiSelectActionMenuProps {
  /** Popover trigger, rendered via Radix asChild (must accept a ref). */
  trigger: ReactElement;
  title: string;
  description?: string;
  options: MultiSelectActionOption[];
  isLoading?: boolean;
  /** Disables interaction and swaps the action label while the action runs. */
  isPending?: boolean;
  searchPlaceholder?: string;
  loadingText?: string;
  emptyText: string;
  noMatchText?: string;
  /** Action button label for the current selection count. */
  actionLabel: (selectedCount: number) => string;
  onAction: (selectedIds: string[]) => void | Promise<void>;
  align?: 'start' | 'end';
  /** Unique prefix for checkbox element ids when several menus share a page. */
  idPrefix: string;
}

/**
 * Shared search + select all/none/inverse + act-on-selection popover.
 * Powers daily check-in template assignment, PM template assignment, and
 * inventory parts access grants so every bulk picker behaves identically.
 */
export function MultiSelectActionMenu({
  trigger,
  title,
  description,
  options,
  isLoading = false,
  isPending = false,
  searchPlaceholder = 'Search...',
  loadingText = 'Loading…',
  emptyText,
  noMatchText = 'No matches for your search.',
  actionLabel,
  onAction,
  align = 'end',
  idPrefix,
}: MultiSelectActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => {
      const haystack = [option.label, option.sublabel ?? '', option.searchText ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [options, search]);

  const selectableFilteredIds = useMemo(
    () => filteredOptions.filter((option) => !option.lockedNote).map((option) => option.id),
    [filteredOptions],
  );

  function toggleOption(optionId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? [...current, optionId] : current.filter((id) => id !== optionId),
    );
  }

  function selectAll() {
    setSelectedIds((current) => [...new Set([...current, ...selectableFilteredIds])]);
  }

  function selectNone() {
    setSelectedIds([]);
  }

  function selectInverse() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of selectableFilteredIds) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return [...next];
    });
  }

  async function handleAction() {
    if (selectedIds.length === 0) return;
    await onAction(selectedIds);
    setSelectedIds([]);
    setSearch('');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-80 p-0">
        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{title}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {!isLoading && filteredOptions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={isPending || selectableFilteredIds.length === 0}
                onClick={selectAll}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={isPending || selectedIds.length === 0}
                onClick={selectNone}
              >
                Select none
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={isPending || selectableFilteredIds.length === 0}
                onClick={selectInverse}
              >
                Inverse
              </Button>
            </div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto border-y px-4 py-2">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{loadingText}</p>
          ) : options.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : filteredOptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{noMatchText}</p>
          ) : (
            <ul className="space-y-2">
              {filteredOptions.map((option) => {
                const isLocked = Boolean(option.lockedNote);
                const checkboxId = `${idPrefix}-${option.id}`;
                return (
                  <li key={option.id} className="flex items-start gap-3 rounded-md border p-3">
                    <Checkbox
                      id={checkboxId}
                      checked={isLocked || selectedIds.includes(option.id)}
                      disabled={isLocked || isPending}
                      onCheckedChange={(checked) => toggleOption(option.id, checked === true)}
                    />
                    <Label
                      htmlFor={checkboxId}
                      className="min-w-0 flex-1 cursor-pointer space-y-1"
                    >
                      <span className="block font-medium leading-tight">{option.label}</span>
                      {option.sublabel && (
                        <span className="block text-xs text-muted-foreground">
                          {option.sublabel}
                        </span>
                      )}
                      {isLocked && (
                        <Badge variant="secondary" className="mt-1 font-normal">
                          {option.lockedNote}
                        </Badge>
                      )}
                    </Label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-4">
          <p className="text-xs text-muted-foreground">{selectedIds.length} selected</p>
          <Button
            type="button"
            size="sm"
            disabled={isPending || selectedIds.length === 0}
            onClick={() => void handleAction()}
          >
            {actionLabel(selectedIds.length)}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
