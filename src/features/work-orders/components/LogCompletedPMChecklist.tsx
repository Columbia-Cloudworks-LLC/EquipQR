import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ClipboardCheck } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PMChecklistItemRow from '@/features/work-orders/components/PMChecklistItemRow';
import type {
  PMChecklistCondition,
  PMChecklistItem,
} from '@/features/pm-templates/services/preventativeMaintenanceService';
import { isNegativePMCondition } from '@/utils/pmChecklistHelpers';
import { cn } from '@/lib/utils';

interface LogCompletedPMChecklistProps {
  items: PMChecklistItem[];
  isLoading: boolean;
  /** The selected template's checklist could not be fetched; saving is held. */
  isError?: boolean;
  exceptionCount: number;
  onConditionChange: (itemId: string, condition: PMChecklistCondition) => void;
  onNotesChange: (itemId: string, notes: string) => void;
}

/**
 * Compact checklist for a PM logged from paper. Collapsed it reads as a
 * one-line "all OK" summary so the record can be saved straight away; expanded
 * it lists every item with one-tap pills for the few that needed attention.
 */
export const LogCompletedPMChecklist: React.FC<LogCompletedPMChecklistProps> = ({
  items,
  isLoading,
  isError = false,
  exceptionCount,
  onConditionChange,
  onNotesChange,
}) => {
  const [open, setOpen] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const sections = useMemo(() => Array.from(new Set(items.map((item) => item.section))), [items]);

  const toggleNotes = useCallback((itemId: string) => {
    setExpandedNotes((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const shouldShowNotes = (item: PMChecklistItem): boolean => {
    const override = expandedNotes[item.id];
    if (override !== undefined) return override;
    return (
      Boolean(item.notes?.trim()) ||
      (item.condition !== null && item.condition !== undefined && isNegativePMCondition(item.condition))
    );
  };

  if (isLoading) {
    return (
      <div role="status" className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Loading PM checklist...
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        Could not load this PM checklist. Choose the template again or turn off Include PM to save.
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'overflow-hidden rounded-lg border',
          exceptionCount > 0 ? 'border-warning/40 bg-warning/5' : 'bg-muted/30',
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <ClipboardCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="font-medium">PM checklist</span>{' '}
              <span className="text-muted-foreground">
                {items.length} items ·{' '}
                {exceptionCount > 0 ? (
                  <span className="font-medium text-warning">
                    {exceptionCount} need{exceptionCount === 1 ? 's' : ''} attention
                  </span>
                ) : (
                  'all OK'
                )}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {open ? 'Hide' : 'Mark exceptions'}
            </span>
            {open ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="max-h-72 overflow-y-auto overscroll-contain border-t border-border/50 bg-card px-3">
            {sections.map((section) => (
              <div key={section}>
                <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section}
                </p>
                <div className="divide-y divide-border/50">
                  {items
                    .filter((item) => item.section === section)
                    .map((item) => (
                      <PMChecklistItemRow
                        key={item.id}
                        item={item}
                        readOnly={false}
                        pmStatus="pending"
                        onConditionChange={onConditionChange}
                        onToggleNotes={toggleNotes}
                        showNotes={shouldShowNotes(item)}
                        onNotesChange={onNotesChange}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
