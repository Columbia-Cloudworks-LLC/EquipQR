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
  showCount?: boolean;
}

const PMProgressIndicator: React.FC<PMProgressIndicatorProps> = ({ workOrderId, hasPM, showCount = false }) => {
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

  const completedCount = segments.filter(s => s.status === 'pass').length;
  const totalCount = segments.length;

  return (
    <div className="flex items-center gap-2">
      {/* PM label */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Preventive Maintenance Checklist">
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-sm">Preventive Maintenance Checklist</p>
        </TooltipContent>
      </Tooltip>

      {/* Segment bar */}
      {segments.length > 0 && (
        <div className="min-w-0 flex-1">
          <SegmentedProgress segments={segments} className="h-2" />
        </div>
      )}

      {showCount && totalCount > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
          {completedCount}/{totalCount}
        </span>
      )}

      {/* Right-side completion icon */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="inline-flex shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={isCompleted ? 'Checklist complete' : 'Checklist incomplete'}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <CircleDashed className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
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


