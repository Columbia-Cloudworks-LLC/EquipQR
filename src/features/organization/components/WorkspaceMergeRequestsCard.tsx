import React from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePersonalOrgMergePreview, useRespondWorkspaceMerge } from '@/features/organization/hooks/useWorkspacePersonalOrgMerge';
import type { WorkspaceMergeRequest } from '@/features/organization/types/workspacePersonalOrgMerge';

interface WorkspaceMergeRequestsCardProps {
  workspaceOrgId: string;
  requests: WorkspaceMergeRequest[];
}

export const WorkspaceMergeRequestsCard: React.FC<WorkspaceMergeRequestsCardProps> = ({
  workspaceOrgId,
  requests,
}) => {
  const { data: preview, isLoading: previewLoading } = usePersonalOrgMergePreview(workspaceOrgId);
  const respondMerge = useRespondWorkspaceMerge();

  if (requests.length === 0) {
    return null;
  }

  const previewItems = [
    { label: 'Equipment', value: preview?.equipment_count ?? 0 },
    { label: 'Work Orders', value: preview?.work_orders_count ?? 0 },
    { label: 'PM Templates', value: preview?.pm_templates_count ?? 0 },
    { label: 'PM Records', value: preview?.pm_records_count ?? 0 },
    { label: 'Inventory Items', value: preview?.inventory_items_count ?? 0 },
  ];

  const hasPersonalOrg = preview?.has_personal_org !== false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Personal Org Merge Request
        </CardTitle>
        <CardDescription>
          Review the request to merge your personal organization data into this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {requests.map((request) => (
          <div key={request.id} className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium">
                  Requested by {request.requested_by_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Expires {format(new Date(request.expires_at), 'MMM d, yyyy')}
                </div>
                {request.request_reason && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Reason: {request.request_reason}
                  </div>
                )}
              </div>
              <Badge variant="secondary">Action Required</Badge>
            </div>

            {!previewLoading && !hasPersonalOrg && (
              <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                <span>No personal organization was found to merge.</span>
              </div>
            )}

            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Data to merge
              </div>
              {previewLoading && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Loading preview...
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {previewItems.map((item) => (
                  <Badge key={item.label} variant="outline">
                    {item.value} {item.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => respondMerge.mutate({ requestId: request.id, accept: true })}
                disabled={respondMerge.isPending || !hasPersonalOrg}
              >
                Accept Merge
              </Button>
              <Button
                variant="outline"
                onClick={() => respondMerge.mutate({ requestId: request.id, accept: false })}
                disabled={respondMerge.isPending}
              >
                Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
