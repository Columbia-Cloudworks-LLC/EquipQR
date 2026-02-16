/**
 * AuditLogTable Component
 * 
 * Displays organization-wide audit logs in a filterable, paginated table.
 * Used on the dedicated Audit Log page.
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  History, 
  Download, 
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useOrganizationAuditLog, useAuditExport } from '@/hooks/useAuditLog';
import { ChangesDiff, ChangesSummary } from './ChangesDiff';
import { 
  AuditLogFilters,
  AuditEntityType,
  AuditAction,
  FormattedAuditEntry,
  AUDIT_ENTITY_TYPES,
  AUDIT_ACTIONS,
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
} from '@/types/audit';

interface AuditLogTableProps {
  organizationId: string;
}

/**
 * Get badge variant for action type
 */
function getActionBadgeVariant(action: AuditAction) {
  switch (action) {
    case 'INSERT':
      return 'default' as const;
    case 'UPDATE':
      return 'secondary' as const;
    case 'DELETE':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

/**
 * Filter bar component
 */
function FilterBar({
  filters,
  onFilterChange,
  onClear,
  onExport,
  isExporting,
}: {
  filters: AuditLogFilters;
  onFilterChange: (filters: AuditLogFilters) => void;
  onClear: () => void;
  onExport: () => void;
  isExporting: boolean;
}) {
  const hasActiveFilters = !!(
    filters.entityType ||
    filters.action ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or user..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        
        {/* Entity Type Filter */}
        <Select
          value={filters.entityType || 'all'}
          onValueChange={(value) => 
            onFilterChange({ 
              ...filters, 
              entityType: value === 'all' ? undefined : value as AuditEntityType 
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.values(AUDIT_ENTITY_TYPES).map((value) => (
              <SelectItem key={value} value={value}>
                {ENTITY_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Action Filter */}
        <Select
          value={filters.action || 'all'}
          onValueChange={(value) => 
            onFilterChange({ 
              ...filters, 
              action: value === 'all' ? undefined : value as AuditAction 
            })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.values(AUDIT_ACTIONS).map((value) => (
              <SelectItem key={value} value={value}>
                {ACTION_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Date From */}
        <Input
          type="date"
          placeholder="From"
          value={filters.dateFrom || ''}
          onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
          className="w-[150px]"
        />
        
        {/* Date To */}
        <Input
          type="date"
          placeholder="To"
          value={filters.dateTo || ''}
          onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
          className="w-[150px]"
        />
        
        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Expandable table row for audit entry
 */
function AuditTableRow({ entry }: { entry: FormattedAuditEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChanges = Object.keys(entry.changes).length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <>
        <TableRow className={cn(isOpen && 'bg-muted/50')}>
          <TableCell className="font-medium">
            <div className="flex flex-col">
              <span>{format(new Date(entry.created_at), 'MMM d, yyyy')}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(entry.created_at), 'h:mm a')}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="outline">{entry.entityTypeLabel}</Badge>
          </TableCell>
          <TableCell>
            <span className="font-medium">{entry.entity_name || 'Unknown'}</span>
          </TableCell>
          <TableCell>
            <Badge variant={getActionBadgeVariant(entry.action)}>
              {entry.actionLabel}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex flex-col">
              <span>{entry.actor_name}</span>
              {entry.actor_email && (
                <span className="text-xs text-muted-foreground">
                  {entry.actor_email}
                </span>
              )}
            </div>
          </TableCell>
          <TableCell>
            <span className="text-sm text-muted-foreground">
              <ChangesSummary changes={entry.changes} />
            </span>
          </TableCell>
          <TableCell>
            {hasChanges && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </TableCell>
        </TableRow>
        
        {hasChanges && (
          <CollapsibleContent asChild>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableCell colSpan={7} className="p-4">
                <div className="max-w-2xl">
                  <h4 className="text-sm font-medium mb-3">Change Details</h4>
                  <ChangesDiff changes={entry.changes} expanded />
                </div>
              </TableCell>
            </TableRow>
          </CollapsibleContent>
        )}
      </>
    </Collapsible>
  );
}

/**
 * Loading skeleton for table
 */
function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-10 w-24" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
          <TableCell><Skeleton className="h-6 w-32" /></TableCell>
          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
          <TableCell><Skeleton className="h-10 w-28" /></TableCell>
          <TableCell><Skeleton className="h-6 w-40" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

/**
 * AuditLogTable main component
 */
export function AuditLogTable({ organizationId }: AuditLogTableProps) {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 50;
  
  const { exportToCsv } = useAuditExport(organizationId);
  
  const {
    data,
    isLoading,
    error,
  } = useOrganizationAuditLog(organizationId, filters, { page, pageSize });
  
  const entries = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToCsv(filters);
    } finally {
      setIsExporting(false);
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
    <div className="space-y-4">
      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        onExport={handleExport}
        isExporting={isExporting}
      />
      
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[140px]">Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
              <TableHead className="w-[160px]">Changed By</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <span className="text-destructive">
                    {error instanceof Error ? error.message : 'Failed to load audit log'}
                  </span>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <EmptyState
                    icon={History}
                    title="No audit entries found"
                    description="Try adjusting your filters or check back later."
                  />
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <AuditTableRow key={entry.id} entry={entry} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
          </span>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogTable;
