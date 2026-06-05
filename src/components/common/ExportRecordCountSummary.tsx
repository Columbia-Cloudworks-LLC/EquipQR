import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

export type ExportRecordCountSummaryProps = {
  recordCount: number;
  isLoadingCount?: boolean;
  filterSummary: string;
  formatBadgeLabel: string;
};

export function ExportRecordCountSummary({
  recordCount,
  isLoadingCount = false,
  filterSummary,
  formatBadgeLabel,
}: ExportRecordCountSummaryProps) {
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Records to Export</p>
          {isLoadingCount ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Counting records...</span>
            </div>
          ) : (
            <p className="text-2xl font-bold">{recordCount.toLocaleString()}</p>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">
          {formatBadgeLabel}
        </Badge>
      </div>
      <Separator className="my-3" />
      <p className="text-xs text-muted-foreground">{filterSummary}</p>
    </div>
  );
}
