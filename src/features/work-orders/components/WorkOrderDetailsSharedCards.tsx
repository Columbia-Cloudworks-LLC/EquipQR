import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clipboard, History } from 'lucide-react';
import { HistoryTab } from '@/components/audit';

export function WorkOrderPMChecklistLoadingCard() {
  return (
    <Card className="shadow-elevation-2" role="status" aria-label="Loading PM checklist">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clipboard className="h-5 w-5" />
          Loading PM Checklist...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-32 bg-muted animate-pulse rounded" aria-hidden="true" />
      </CardContent>
    </Card>
  );
}

type WorkOrderFieldChangeHistoryCardProps = {
  workOrderId: string;
  organizationId: string;
};

export function WorkOrderFieldChangeHistoryCard({
  workOrderId,
  organizationId,
}: WorkOrderFieldChangeHistoryCardProps) {
  return (
    <Card className="shadow-elevation-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Change History (Field Edits)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Shows who changed work order fields and when.
        </p>
        <HistoryTab
          entityType="work_order"
          entityId={workOrderId}
          organizationId={organizationId}
        />
      </CardContent>
    </Card>
  );
}
