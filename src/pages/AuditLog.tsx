/**
 * Audit Log Page
 *
 * Displays organization-wide audit trail for regulatory compliance and
 * accountability tracking via the Logflare-style explorer (issue #641):
 * timeline histogram on top, dense severity-tagged list below, persistent
 * detail panel on the right. CSV / JSON export and the entity-history
 * timeline on detail pages are unchanged.
 */

import React from 'react';
import { History, Shield, AlertCircle } from 'lucide-react';
import Page from '@/components/layout/Page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditStats } from '@/hooks/useAuditLog';
import { useOrganization } from '@/contexts/OrganizationContext';
import { AuditExplorer } from '@/components/audit/explorer';

/**
 * Stats cards showing audit summary
 */
function AuditStatsCards({ organizationId }: { organizationId: string }) {
  const { data: stats, isLoading } = useAuditStats(organizationId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  // Calculate totals for each action
  const createdCount = stats.byAction?.INSERT || 0;
  const updatedCount = stats.byAction?.UPDATE || 0;
  const deletedCount = stats.byAction?.DELETE || 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalEntries.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Records Created
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{createdCount.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Records Updated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-info">{updatedCount.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Records Deleted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{deletedCount.toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Audit Log Page Component
 */
function AuditLog() {
  const { currentOrganization } = useOrganization();

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Organization Selected</AlertTitle>
          <AlertDescription>
            Please select an organization to view the audit log.
          </AlertDescription>
        </Alert>
      </Page>
    );
  }

  return (
    <Page maxWidth="full" padding="responsive">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <History className="h-7 w-7 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-bold leading-tight">Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              Track all changes made to your organization's data for compliance and accountability.{' '}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2 text-sm">
                    <Shield className="h-3 w-3" />
                    Regulatory compliance
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  This audit log helps you comply with OSHA, DOT, and other regulatory requirements
                  by maintaining a complete record of all equipment, work order, and inventory changes.
                  Records are immutable and cannot be modified or deleted.
                </TooltipContent>
              </Tooltip>
            </p>
          </div>
        </div>

        {/* Stats */}
        <AuditStatsCards organizationId={currentOrganization.id} />

        {/* Logflare-style explorer */}
        <AuditExplorer organizationId={currentOrganization.id} />
      </div>
    </Page>
  );
}

export default AuditLog;
