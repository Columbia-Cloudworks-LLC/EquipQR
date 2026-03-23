/**
 * AuditLogTable Component
 *
 * Displays organization-wide audit logs in a filterable, paginated table.
 * Used on the dedicated Audit Log page.
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EmptyState from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useOrganizationAuditLog, useAuditExport } from '@/hooks/useAuditLog';
import { usePermissions } from '@/hooks/usePermissions';
import { ChangesSummary } from './ChangesDiff';
import { AuditEntryDetailSheet } from './AuditEntryDetailSheet';
import AuditLogToolbar from './AuditLogToolbar';
import {
  AuditLogFilters,
  AuditAction,
  FormattedAuditEntry,
} from '@/types/audit';

interface AuditLogTableProps {
  organizationId: string;
}

/**
 * Get badge variant for action type
 */
function getActionBadgeVariant(action: AuditAction) {
  switch (action) {
    case 'INSERT': return 'default' as const;
    case 'UPDATE': return 'secondary' as const;
    case 'DELETE': return 'destructive' as const;
    default: return 'outline' as const;
  }
}

/**
 * Dense audit table row with tooltips and row-click to open detail Sheet
 */
function AuditTableRow({
  entry,
  onClick,
}: {
  entry: FormattedAuditEntry;
  onClick: () => void;
}) {
  const hasChanges = Object.keys(entry.changes).length > 0;

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/40 transition-colors"
      onClick={onClick}
      aria-label={`View details for ${entry.entity_name ?? 'audit entry'}`}
    >
      {/* Date — tooltip shows relative time */}
      <TableCell className="py-1.5 px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium tabular-nums">
                {format(new Date(entry.created_at), 'MMM d, yyyy')}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {format(new Date(entry.created_at), 'h:mm a')}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {entry.relativeTime}
          </TooltipContent>
        </Tooltip>
      </TableCell>

      {/* Type + Action — combined column */}
      <TableCell className="py-1.5 px-3">
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className="text-[11px] py-0 px-1.5 h-4 w-fit font-normal">
            {entry.entityTypeLabel}
          </Badge>
          <Badge
            variant={getActionBadgeVariant(entry.action)}
            className="text-[11px] py-0 px-1.5 h-4 w-fit font-normal"
          >
            {entry.actionLabel}
          </Badge>
        </div>
      </TableCell>

      {/* Name — tooltip shows full name + entity ID */}
      <TableCell className="py-1.5 px-3 max-w-[180px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block truncate text-sm font-medium">
              {entry.entity_name ?? 'Unknown'}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[260px]">
            <div className="space-y-1">
              <p className="font-medium">{entry.entity_name ?? 'Unknown'}</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                ID: {entry.entity_id}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TableCell>

      {/* Changed By — tooltip shows email */}
      <TableCell className="py-1.5 px-3 max-w-[160px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block truncate text-sm">{entry.actor_name}</span>
          </TooltipTrigger>
          {entry.actor_email ? (
            <TooltipContent side="right">
              {entry.actor_email}
            </TooltipContent>
          ) : null}
        </Tooltip>
      </TableCell>

      {/* Summary — tooltip shows full change detail */}
      <TableCell className="py-1.5 px-3 max-w-[260px]">
        {hasChanges ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate text-xs text-muted-foreground cursor-default">
                <ChangesSummary changes={entry.changes} />
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="max-w-[320px] text-xs leading-relaxed"
            >
              <div className="space-y-0.5">
                {Object.entries(entry.changes)
                  .slice(0, 8)
                  .map(([field, change]) => {
                    const label = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                    return (
                      <div key={field} className="flex items-start gap-1.5">
                        <span className="font-medium shrink-0">{label}:</span>
                        <span className="text-muted-foreground">
                          {change.old !== null && change.new !== null
                            ? `${String(change.old)} → ${String(change.new)}`
                            : change.old === null
                              ? `set to ${String(change.new)}`
                              : 'cleared'}
                        </span>
                      </div>
                    );
                  })}
                {Object.keys(entry.changes).length > 8 && (
                  <p className="text-muted-foreground/70 mt-1">
                    +{Object.keys(entry.changes).length - 8} more — click row for full details
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic">No changes</span>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * Loading skeleton for table
 */
function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <TableRow key={i}>
          <TableCell className="py-1.5 px-3"><Skeleton className="h-8 w-20" /></TableCell>
          <TableCell className="py-1.5 px-3"><Skeleton className="h-8 w-24" /></TableCell>
          <TableCell className="py-1.5 px-3"><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell className="py-1.5 px-3"><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell className="py-1.5 px-3"><Skeleton className="h-4 w-40" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

/**
 * AuditLogTable main component
 */
export function AuditLogTable({ organizationId }: AuditLogTableProps) {
  const { canManageOrganization } = usePermissions();
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressLabel, setExportProgressLabel] = useState<string | undefined>(undefined);
  const [selectedEntry, setSelectedEntry] = useState<FormattedAuditEntry | null>(null);
  const pageSize = 50;
  const canExport = canManageOrganization();

  const { exportToCsv, exportToJson } = useAuditExport(organizationId);

  const { data, isLoading, error } = useOrganizationAuditLog(
    organizationId,
    filters,
    { page, pageSize }
  );

  const entries = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleExportCsv = async () => {
    if (!canExport) return;
    setIsExporting(true);
    setExportProgressLabel('Preparing export...');
    try {
      await exportToCsv(filters, ({ current, total }) => {
        setExportProgressLabel(
          total === 0
            ? 'No matching records found.'
            : `Exporting ${current.toLocaleString()} of ${total.toLocaleString()} records...`
        );
      });
    } finally {
      setIsExporting(false);
      setExportProgressLabel(undefined);
    }
  };

  const handleExportJson = async () => {
    if (!canExport) return;
    setIsExporting(true);
    setExportProgressLabel('Preparing export...');
    try {
      await exportToJson(filters, ({ current, total }) => {
        setExportProgressLabel(
          total === 0
            ? 'No matching records found.'
            : `Exporting ${current.toLocaleString()} of ${total.toLocaleString()} records...`
        );
      });
    } finally {
      setIsExporting(false);
      setExportProgressLabel(undefined);
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleFilterChange = (newFilters: AuditLogFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <AuditLogToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        isExporting={isExporting}
        exportProgressLabel={exportProgressLabel}
        canExport={canExport}
        resultCount={totalCount}
      />

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-2 px-3 text-xs w-[110px]">Date</TableHead>
              <TableHead className="py-2 px-3 text-xs w-[130px]">Type / Action</TableHead>
              <TableHead className="py-2 px-3 text-xs">Name</TableHead>
              <TableHead className="py-2 px-3 text-xs w-[150px]">Changed By</TableHead>
              <TableHead className="py-2 px-3 text-xs">Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <span className="text-destructive">
                    {error instanceof Error ? error.message : 'Failed to load audit log'}
                  </span>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <EmptyState
                    icon={History}
                    title="No audit entries found"
                    description="Try adjusting your filters or check back later."
                  />
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <AuditTableRow
                  key={entry.id}
                  entry={entry}
                  onClick={() => setSelectedEntry(entry)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} of{' '}
            {totalCount.toLocaleString()} entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <AuditEntryDetailSheet
        entry={selectedEntry}
        open={!!selectedEntry}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
      />
    </div>
  );
}

export default AuditLogTable;
