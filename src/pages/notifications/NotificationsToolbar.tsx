import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import NotificationsFilterPopover from './NotificationsFilterPopover';

interface NotificationsToolbarProps {
  searchTerm: string;
  filterType: string;
  filterRead: string;
  resultCount: number;
  onSearchChange: (value: string) => void;
  onFilterTypeChange: (value: string) => void;
  onFilterReadChange: (value: string) => void;
  onClearFilters: () => void;
}

const typeLabels: Record<string, string> = {
  work_order_submitted: 'Submitted',
  work_order_accepted: 'Accepted',
  work_order_assigned: 'Assigned',
  work_order_in_progress: 'In Progress',
  work_order_on_hold: 'On Hold',
  work_order_completed: 'Completed',
  work_order_cancelled: 'Cancelled',
  ownership_transfer_request: 'Transfer Request',
  ownership_transfer_accepted: 'Transfer Accepted',
  ownership_transfer_rejected: 'Transfer Declined',
  workspace_merge_request: 'Merge Request',
  workspace_merge_accepted: 'Merge Accepted',
  workspace_merge_rejected: 'Merge Declined',
  member_added: 'Member Added',
  member_role_changed: 'Org Role Changed',
  team_member_added: 'Team Member Added',
  team_member_role_changed: 'Team Role Changed',
  audit_export: 'Audit Export',
};

const NotificationsToolbar: React.FC<NotificationsToolbarProps> = ({
  searchTerm,
  filterType,
  filterRead,
  resultCount,
  onSearchChange,
  onFilterTypeChange,
  onFilterReadChange,
  onClearFilters,
}) => {
  const activeFilterCount = [
    filterType !== 'all',
    filterRead !== 'all',
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || !!searchTerm;

  return (
    <div className="flex flex-col gap-2">
      {/* Single toolbar row */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        {/* Search */}
        <div className="relative flex-1 max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-sm bg-transparent"
            aria-label="Search notifications"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Filter popover */}
        <NotificationsFilterPopover
          filterType={filterType}
          filterRead={filterRead}
          activeFilterCount={activeFilterCount}
          onFilterTypeChange={onFilterTypeChange}
          onFilterReadChange={onFilterReadChange}
          onClearFilters={onClearFilters}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Result count */}
        <span
          className="text-xs text-muted-foreground whitespace-nowrap hidden lg:block"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="font-medium text-foreground">{resultCount}</span>
          {' notifications'}
        </span>
      </div>

      {/* Active filter badges row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground">Active:</span>

          {filterType !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {typeLabels[filterType] ?? filterType}
              <button
                onClick={() => onFilterTypeChange('all')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear type filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filterRead !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {filterRead === 'unread' ? 'Unread' : 'Read'}
              <button
                onClick={() => onFilterReadChange('all')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear read status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClearFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationsToolbar;
