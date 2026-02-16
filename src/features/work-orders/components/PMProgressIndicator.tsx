import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import { Wrench, CheckCircle2 } from 'lucide-react';
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
      <div className="flex items-center gap-1">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Wrench className="h-4 w-4 text-primary" />
        )}
        <Badge variant="secondary" className="text-xs">
          PM {isCompleted ? 'Complete' : 'Required'}
        </Badge>
      </div>
      
      {segments.length > 0 && (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <SegmentedProgress segments={segments} className="h-2 flex-1" />
        </div>
      )}
    </div>
  );
};

export default PMProgressIndicator;

