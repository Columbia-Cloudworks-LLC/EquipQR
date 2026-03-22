import React, { useMemo } from 'react';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wrench, CheckCircle2, CircleDashed } from 'lucide-react';
import { usePMByWorkOrderId } from '@/features/pm-templates/hooks/usePMData';
import { getItemStatus } from '@/utils/pmChecklistHelpers';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

interface PMProgressIndicatorProps {
  workOrderId: string;
  hasPM: boolean;
}

const PMProgressIndicator: React.FC<PMProgressIndicatorProps> = ({ workOrderId, hasPM }) => {
  const { data: pmData } = usePMByWorkOrderId(workOrderId);

  // Parse checklist data and create segments for all items
  // Must be called before early return to follow Rules of Hooks
  const segments = useMemo(() => {
    if (!pmData?.checklist_data || !Array.isArray(pmData.checklist_data)) {
      return [];
    }

    try {
      const checklistItems = pmData.checklist_data as PMChecklistItem[];
      return checklistItems.map(item => ({
        id: item.id,
        status: getItemStatus(item),
        section: item.section,
        title: item.title,
        notes: item.notes
      }));
    } catch {
      return [];
    }
  }, [pmData?.checklist_data]);

  if (!hasPM || !pmData) {
    return null;
  }

  const isCompleted = pmData?.status === 'completed';

  return (
    <div className="flex items-center gap-2">
      {/* PM label */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-sm">Preventive Maintenance Checklist</p>
        </TooltipContent>
      </Tooltip>

      {/* Segment bar — colors always reflect actual condition severity */}
      {segments.length > 0 && (
        <div className="min-w-0 flex-1">
          <SegmentedProgress segments={segments} className="h-2" />
        </div>
      )}

      {/* Right-side completion icon */}
      <Tooltip>
        <TooltipTrigger asChild>
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          ) : (
            <CircleDashed className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-sm">
            {isCompleted ? 'Checklist complete' : 'Checklist incomplete'}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default PMProgressIndicator;


