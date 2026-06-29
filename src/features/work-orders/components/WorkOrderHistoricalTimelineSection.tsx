import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarClock } from 'lucide-react';
import WorkOrderTimeline from '@/features/work-orders/components/WorkOrderTimeline';
import { HistoricalTimelineEditorDialog } from '@/features/work-orders/components/HistoricalTimelineEditorDialog';
import { useWorkOrderTimeline } from '@/features/work-orders/hooks/useHistoricalWorkOrders';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

type WorkOrderHistoricalTimelineSectionProps = {
  workOrder: WorkOrder;
  showDetailedHistory?: boolean;
  canEditTimeline: boolean;
};

export function WorkOrderHistoricalTimelineSection({
  workOrder,
  showDetailedHistory = true,
  canEditTimeline,
}: WorkOrderHistoricalTimelineSectionProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const isHistorical = Boolean(workOrder.isHistorical ?? workOrder.is_historical);
  const { data: historyRows = [] } = useWorkOrderTimeline(workOrder.id);

  return (
    <>
      <WorkOrderTimeline
        workOrder={workOrder}
        showDetailedHistory={showDetailedHistory}
        headerAction={
          isHistorical && canEditTimeline ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Edit historical timeline
            </Button>
          ) : null
        }
      />

      {isHistorical && canEditTimeline ? (
        <HistoricalTimelineEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          workOrderId={workOrder.id}
          organizationId={workOrder.organization_id}
          equipmentId={workOrder.equipment_id}
          historyRows={historyRows}
        />
      ) : null}
    </>
  );
}
