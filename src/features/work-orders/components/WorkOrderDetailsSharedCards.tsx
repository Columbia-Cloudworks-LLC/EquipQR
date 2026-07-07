import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clipboard, History } from 'lucide-react';
import { ORGANIZATION_AUDIT_LOG_PATH } from '@/features/organization/constants/routes';

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

type WorkOrderAuditLogLinkProps = {
  workOrderId: string;
};

/**
 * Audit data is kept off operational pages (#1122). Owners/admins get a deep
 * link into the dedicated audit log explorer, pre-filtered to this work order.
 */
export function WorkOrderAuditLogLink({ workOrderId }: WorkOrderAuditLogLinkProps) {
  return (
    <Button variant="link" size="sm" asChild className="h-auto px-0 text-xs text-muted-foreground">
      <Link to={`${ORGANIZATION_AUDIT_LOG_PATH}?entityType=work_order&entityId=${workOrderId}`}>
        <History className="mr-1 h-3.5 w-3.5" />
        View field change history in the Audit Log
      </Link>
    </Button>
  );
}
