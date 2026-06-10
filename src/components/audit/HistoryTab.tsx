/**
 * HistoryTab Component
 * 
 * Displays audit history for a specific entity in a timeline format.
 * Used in Equipment, Work Order, and Inventory detail pages.
 */

import React, { useState } from 'react';
import { 
  History, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Pencil, 
  Trash2,
  Filter,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useEntityHistory } from '@/hooks/useAuditLog';
import { ChangesDiff, ChangesSummary } from './ChangesDiff';
import { 
  AuditEntityType, 
  FormattedAuditEntry, 
  AuditAction,
  AUDIT_ACTIONS,
} from '@/types/audit';
import EmptyState from '@/components/ui/empty-state';
import { HistoryEntryHeader } from './HistoryEntryHeader';

interface HistoryTabProps {
  entityType: AuditEntityType;
  entityId: string;
  organizationId: string;
}

/**
 * Get the icon for an action type
 */
function getActionIcon(action: AuditAction) {
  switch (action) {
    case 'INSERT':
      return <Plus className="h-4 w-4" />;
    case 'UPDATE':
      return <Pencil className="h-4 w-4" />;
    case 'DELETE':
      return <Trash2 className="h-4 w-4" />;
    default:
      return <History className="h-4 w-4" />;
  }
}

/**
 * Get the color for an action type
 */
function getActionColor(action: AuditAction) {
  switch (action) {
    case 'INSERT':
      return 'bg-success/20 text-success dark:bg-success/20 dark:text-success';
    case 'UPDATE':
      return 'bg-info/20 text-info dark:bg-info/20 dark:text-info';
    case 'DELETE':
      return 'bg-destructive/20 text-destructive dark:bg-destructive/20 dark:text-destructive';
    default:
      return 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground';
  }
}

/**
 * Single history entry component
 */
function HistoryEntry({ entry }: { entry: FormattedAuditEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChanges = Object.keys(entry.changes).length > 0;
  
  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-3 top-6 bottom-0 w-px bg-border last:hidden" />
      
      {/* Timeline dot */}
      <div 
        className={cn(
          "absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center",
          getActionColor(entry.action)
        )}
      >
        {getActionIcon(entry.action)}
      </div>
      
      {/* Content */}
      <Card className="ml-2">
        <CardContent standalone>
          {hasChanges ? (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <HistoryEntryHeader
                entry={entry}
                getActionColor={getActionColor}
                trailing={
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="ml-1">{isExpanded ? 'Hide' : 'Show'} Details</span>
                    </Button>
                  </CollapsibleTrigger>
                }
              />

              {!isExpanded && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <ChangesSummary changes={entry.changes} />
                </div>
              )}

              <CollapsibleContent
                className={cn(
                  'pm-collapsible-animate overflow-hidden border-t pt-4 mt-4',
                  'data-[state=open]:animate-in data-[state=closed]:animate-out',
                  'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
                  'data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2',
                  'data-[state=open]:duration-200 data-[state=closed]:duration-150'
                )}
              >
                <ChangesDiff changes={entry.changes} expanded />
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <HistoryEntryHeader entry={entry} getActionColor={getActionColor} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Loading skeleton for history entries
 */
function HistoryEntrySkeleton() {
  return (
    <div className="relative pl-8 pb-6">
      <div className="absolute left-0 top-1">
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>
      <Card className="ml-2">
        <CardContent standalone>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-4 mt-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * HistoryTab main component
 */
export function HistoryTab({ entityType, entityId, organizationId }: HistoryTabProps) {
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useEntityHistory(organizationId, entityType, entityId, {
    pageSize: 20,
  });
  
  // Flatten pages into single array
  const entries = data?.pages.flatMap((page) => (page as unknown as { data: FormattedAuditEntry[] }).data) ?? [];
  
  // Filter entries by action type
  const filteredEntries = actionFilter === 'all' 
    ? entries 
    : entries.filter(entry => entry.action === actionFilter);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-0 py-4">
        <HistoryEntrySkeleton />
        <HistoryEntrySkeleton />
        <HistoryEntrySkeleton />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <EmptyState
        icon={History}
        title="Failed to load history"
        description={error instanceof Error ? error.message : 'An error occurred'}
      />
    );
  }
  
  // Empty state
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No history yet"
        description="Changes to this item will appear here once they're made."
      />
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Select 
          value={actionFilter} 
          onValueChange={(value) => setActionFilter(value as AuditAction | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value={AUDIT_ACTIONS.INSERT}>Created</SelectItem>
            <SelectItem value={AUDIT_ACTIONS.UPDATE}>Updated</SelectItem>
            <SelectItem value={AUDIT_ACTIONS.DELETE}>Deleted</SelectItem>
          </SelectContent>
        </Select>
        
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredEntries.length} of {entries.length} entries
        </span>
      </div>
      
      {/* Timeline */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-0 py-2">
          {filteredEntries.map((entry) => (
            <HistoryEntry key={entry.id} entry={entry} />
          ))}
          
          {/* Load more button */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}


