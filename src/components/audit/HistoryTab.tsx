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
  User,
  Clock,
  Filter,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'UPDATE':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'DELETE':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
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
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("font-medium", getActionColor(entry.action))}>
                  {entry.actionLabel}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {entry.changeCount} field{entry.changeCount !== 1 ? 's' : ''} changed
                </span>
              </div>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span>{entry.actor_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span title={entry.formattedDate}>{entry.relativeTime}</span>
                </div>
              </div>
            </div>
            
            {hasChanges && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="shrink-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="ml-1">{isExpanded ? 'Hide' : 'Show'} Details</span>
              </Button>
            )}
          </div>
          
          {/* Collapsed summary */}
          {!isExpanded && hasChanges && (
            <div className="mt-3 text-sm text-muted-foreground">
              <ChangesSummary changes={entry.changes} />
            </div>
          )}
          
          {/* Expanded changes */}
          {isExpanded && hasChanges && (
            <div className="mt-4 pt-4 border-t">
              <ChangesDiff changes={entry.changes} expanded />
            </div>
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
        <CardContent className="p-4">
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
  const entries = data?.pages.flatMap(page => page.data) ?? [];
  
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

export default HistoryTab;
