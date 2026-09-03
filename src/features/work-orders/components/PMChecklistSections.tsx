import React from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSegmentsForSection, isNegativePMCondition } from '@/utils/pmChecklistHelpers';
import { PMChecklistItem, type PMChecklistCondition } from '@/features/pm-templates/services/preventativeMaintenanceService';
import PMChecklistItemRow from '@/features/work-orders/components/PMChecklistItemRow';

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
  getItemBorderClass: (item: PMChecklistItem) => string;
  handleNotesItemChange: (itemId: string, notes: string) => void;
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
  getItemBorderClass,
  handleNotesItemChange,
}) => {
  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const sectionProgress = getSectionProgress(section);
        const sectionItems = checklist.filter(item => item.section === section);
        const segments = createSegmentsForSection(sectionItems);
        const flaggedItemsCount = sectionItems.filter(
          (item) => item.condition !== null && item.condition !== undefined && isNegativePMCondition(item.condition),
        ).length;
        const hasFindings = flaggedItemsCount > 0;

        return (
          <Collapsible key={section} open={openSections[section]} onOpenChange={() => toggleSection(section)}>
            <div
              className={cn(
                'overflow-hidden rounded-lg border bg-background shadow-sm transition-colors',
                hasFindings && 'border-warning/40 bg-warning/5',
              )}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto w-full flex-col items-stretch gap-3 whitespace-normal rounded-none p-4 text-left hover:bg-accent/50 active:bg-accent/40 active:scale-[0.99] transition-all duration-75 touch-manipulation"
                >
                  <div className="flex w-full flex-col items-stretch gap-3 whitespace-normal text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="block font-semibold">{section}</span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {sectionProgress.completed}/{sectionProgress.total} items completed ({Math.round(sectionProgress.percentage)}%)
                          </span>
                          {flaggedItemsCount > 0 ? (
                            <span className="rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning">
                              {flaggedItemsCount} flagged
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'mt-0.5 shrink-0 rounded-full border border-border/60 bg-background/90 p-1 text-muted-foreground',
                          hasFindings && 'border-warning/40 text-warning',
                        )}
                      >
                        {openSections[section] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                    </div>
                    {segments.length > 0 ? (
                      <div aria-hidden="true" className="pointer-events-none">
                        <SegmentedProgress segments={segments} className="h-1.5 rounded-full bg-muted/70" />
                      </div>
                    ) : null}
                  </div>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent
              className="pm-collapsible-animate space-y-3 pt-2 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2 data-[state=open]:duration-200 data-[state=closed]:duration-200"
            >
              {sectionItems.map((item) => (
                <PMChecklistItemRow
                  key={item.id}
                  item={item}
                  readOnly={readOnly}
                  pmStatus={pmStatus}
                  onConditionChange={handleChecklistItemChange}
                  onToggleNotes={toggleNotesVisibility}
                  showNotes={shouldShowNotes(item)}
                  borderClass={getItemBorderClass(item)}
                  onNotesChange={handleNotesItemChange}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default PMChecklistSections;
