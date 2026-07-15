import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock } from 'lucide-react';
import WorkOrderTimeline from '@/features/work-orders/components/WorkOrderTimeline';
import { HistoricalTimelineEditorDialog } from '@/features/work-orders/components/HistoricalTimelineEditorDialog';
import { useWorkOrderTimeline } from '@/features/work-orders/hooks/useHistoricalWorkOrders';
import {
  historyRowsToEvents,
  synthesizeDefaultTimeline,
  validateTimelineEvents,
  type HistoricalTimelineEvent,
} from '@/features/work-orders/utils/historicalTimeline';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

type WorkOrderHistoricalTimelineSectionProps = {
  workOrder: WorkOrder;
  showDetailedHistory?: boolean;
  canEditTimeline: boolean;
};

function buildConversionSeedEvents(
  workOrder: WorkOrder,
  historyRows: Array<{
    new_status: string;
    changed_at: string;
    reason: string | null;
    metadata: Record<string, unknown> | null;
  }>,
): HistoricalTimelineEvent[] {
  if (historyRows.length > 0) {
    const historyEvents = historyRowsToEvents(historyRows);
    if (validateTimelineEvents(historyEvents).length === 0) {
      return historyEvents;
    }
  }

  const startDate = workOrder.historical_start_date ?? workOrder.created_date;
  if (!startDate) {
    return [];
  }

  return synthesizeDefaultTimeline({
    startDate: new Date(startDate),
    finalStatus: workOrder.status,
    completedDate: workOrder.completed_date ? new Date(workOrder.completed_date) : null,
    assigneeId: workOrder.assignee_id,
  });
}

export function WorkOrderHistoricalTimelineSection({
  workOrder,
  showDetailedHistory = true,
  canEditTimeline,
}: WorkOrderHistoricalTimelineSectionProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'edit' | 'convert'>('edit');
  const isHistorical = Boolean(workOrder.isHistorical ?? workOrder.is_historical);
  const { data: historyRows = [], isSuccess: historyReady } = useWorkOrderTimeline(workOrder.id);

  const conversionSeedEvents = useMemo(
    () => buildConversionSeedEvents(workOrder, historyRows),
    [historyRows, workOrder],
  );

  const openEditor = (mode: 'edit' | 'convert') => {
    setEditorMode(mode);
    setEditorOpen(true);
  };

  return (
    <>
      <WorkOrderTimeline
        workOrder={workOrder}
        showDetailedHistory={showDetailedHistory}
        headerAction={
          canEditTimeline ? (
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary" className="text-xs font-normal">
                Admin
              </Badge>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2"
                aria-label="Edit Timeline"
                onClick={() => openEditor(isHistorical ? 'edit' : 'convert')}
              >
                <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-sm">Edit Timeline</span>
              </Button>
            </div>
          ) : null
        }
      />

      {canEditTimeline ? (
        <HistoricalTimelineEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          workOrderId={workOrder.id}
          organizationId={workOrder.organization_id}
          equipmentId={workOrder.equipment_id}
          historyRows={historyRows}
          historyReady={historyReady}
          mode={editorMode}
          title={editorMode === 'convert' ? 'Import paper records' : 'Edit historical timeline'}
          initialEvents={editorMode === 'convert' ? conversionSeedEvents : undefined}
        />
      ) : null}
    </>
  );
}
