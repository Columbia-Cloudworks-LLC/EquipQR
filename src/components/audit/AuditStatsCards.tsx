/**
 * AuditStatsCards — key-metrics summary for the audit log dashboard.
 * Extracted from the AuditLog page so it can live inside the customizable
 * dashboard grid as a collapsible widget (#1166).
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditStats } from '@/hooks/useAuditLog';

export function AuditStatsCards({ organizationId }: { organizationId: string }) {
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

  const createdCount = stats.byAction?.INSERT || 0;
  const updatedCount = stats.byAction?.UPDATE || 0;
  const deletedCount = stats.byAction?.DELETE || 0;

  return (
    <div className="grid gap-4 md:grid-cols-4" data-testid="audit-stats-cards">
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
