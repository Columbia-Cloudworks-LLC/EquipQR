import React from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { createSegmentsForSection } from '@/utils/pmChecklistHelpers';
import { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import PMChecklistItemRow from '@/features/work-orders/components/PMChecklistItemRow';

interface PMChecklistSectionsProps {
  sections: string[];
  checklist: PMChecklistItem[];
  openSections: Record<string, boolean>;
  readOnly: boolean;
  pmStatus: string;
  toggleSection: (section: string) => void;
  getSectionProgress: (section: string) => { completed: number; total: number; percentage: number };
  handleChecklistItemChange: (itemId: string, condition: 1 | 2 | 3 | 4 | 5) => void;
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

        return (
          <Collapsible key={section} open={openSections[section]} onOpenChange={() => toggleSection(section)}>
            <CollapsibleTrigger asChild>
              <div className="relative overflow-hidden rounded-lg border bg-background shadow-sm">
                <SegmentedProgress
                  segments={segments}
                  className="absolute inset-0 h-full opacity-30"
                />
                <Button variant="ghost" className="relative w-full justify-between p-4 h-auto hover:bg-accent/50">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-left">{section}</span>
                    <span className="text-xs text-muted-foreground">
                      {sectionProgress.completed}/{sectionProgress.total} items completed ({Math.round(sectionProgress.percentage)}%)
                    </span>
                  </div>
                  {openSections[section] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </CollapsibleTrigger>
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
