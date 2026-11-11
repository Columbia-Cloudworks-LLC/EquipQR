import React from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import { CheckCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSegmentsForSection, isNegativePMCondition } from '@/utils/pmChecklistHelpers';
import { PMChecklistItem, type PMChecklistCondition } from '@/features/pm-templates/services/preventativeMaintenanceService';
import PMChecklistItemRow from '@/features/work-orders/components/PMChecklistItemRow';
import { isPMChecklistItemComplete } from '@/features/work-orders/utils/pmChecklistInit';

interface PMChecklistSectionsProps {
  sections: string[];
  checklist: PMChecklistItem[];
  openSections: Record<string, boolean>;
  readOnly: boolean;
  pmStatus: string;
  toggleSection: (section: string) => void;
  getSectionProgress: (section: string) => { completed: number; total: number; percentage: number };
  handleChecklistItemChange: (itemId: string, condition: PMChecklistCondition) => void;
  toggleNotesVisibility: (itemId: string) => void;
  shouldShowNotes: (item: PMChecklistItem) => boolean;
  handleNotesItemChange: (itemId: string, notes: string) => void;
  /** Rates every not-yet-rated item in the section OK; flagged items are left alone. */
  onMarkSectionOK?: (section: string) => void;
  /** When set, flagged items offer a one-tap follow-up repair work order. */
  onCreateFollowUp?: (item: PMChecklistItem) => void;
}

const PMChecklistSections: React.FC<PMChecklistSectionsProps> = ({
  sections,
  checklist,
  openSections,
  readOnly,
  pmStatus,
  toggleSection,
  getSectionProgress,
  handleChecklistItemChange,
  toggleNotesVisibility,
  shouldShowNotes,
  handleNotesItemChange,
  onMarkSectionOK,
  onCreateFollowUp,
}) => {
  const editable = !readOnly && pmStatus !== 'completed';

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const sectionProgress = getSectionProgress(section);
        const sectionItems = checklist.filter(item => item.section === section);
        const segments = createSegmentsForSection(sectionItems);
        const flaggedItemsCount = sectionItems.filter(
          (item) => item.condition !== null && item.condition !== undefined && isNegativePMCondition(item.condition),
        ).length;
        const hasFindings = flaggedItemsCount > 0;
        const hasUnratedItems = sectionItems.some((item) => !isPMChecklistItemComplete(item));
        const isOpen = Boolean(openSections[section]);

        return (
          <Collapsible key={section} open={isOpen} onOpenChange={() => toggleSection(section)}>
            <div
              className={cn(
                'overflow-hidden rounded-lg border bg-background transition-colors',
                hasFindings && 'border-warning/40 bg-warning/5',
              )}
            >
              <div className="flex items-stretch">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 flex-col items-stretch gap-1.5 whitespace-normal rounded-none px-3 py-2 text-left hover:bg-accent/50 active:bg-accent/40 touch-manipulation"
                  >
                    <div className="flex w-full items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                      {/* Name and count stack on phones so the name is never squeezed out. */}
                      <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold sm:flex-1">{section}</span>
                        <span className="text-xs font-normal text-muted-foreground sm:shrink-0">
                          {sectionProgress.completed}/{sectionProgress.total} items completed ({Math.round(sectionProgress.percentage)}%)
                        </span>
                      </span>
                      {flaggedItemsCount > 0 ? (
                        <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                          {flaggedItemsCount} flagged
                        </span>
                      ) : null}
                    </div>
                    {segments.length > 0 ? (
                      <div aria-hidden="true" className="pointer-events-none">
                        <SegmentedProgress segments={segments} className="h-1.5 rounded-full bg-muted/70" />
                      </div>
                    ) : null}
                  </Button>
                </CollapsibleTrigger>
                {editable && onMarkSectionOK && hasUnratedItems ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto shrink-0 gap-1 rounded-none border-l border-border/50 px-2.5 text-xs text-muted-foreground hover:text-success touch-manipulation"
                    onClick={() => onMarkSectionOK(section)}
                    aria-label={`Mark ${section} section OK`}
                  >
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Mark Section OK</span>
                    <span className="sm:hidden">All OK</span>
                  </Button>
                ) : null}
              </div>
              <CollapsibleContent
                className="pm-collapsible-animate overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:duration-200 data-[state=closed]:duration-200"
              >
                <div className="divide-y divide-border/50 border-t border-border/50 bg-card px-3">
                  {sectionItems.map((item) => (
                    <PMChecklistItemRow
                      key={item.id}
                      item={item}
                      readOnly={readOnly}
                      pmStatus={pmStatus}
                      onConditionChange={handleChecklistItemChange}
                      onToggleNotes={toggleNotesVisibility}
                      showNotes={shouldShowNotes(item)}
                      onNotesChange={handleNotesItemChange}
                      onCreateFollowUp={onCreateFollowUp}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default PMChecklistSections;
