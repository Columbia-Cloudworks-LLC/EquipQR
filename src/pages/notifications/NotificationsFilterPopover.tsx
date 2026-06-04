import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FilterPopoverShell } from '@/components/filters/FilterPopoverShell';

interface NotificationsFilterPopoverProps {
  filterType: string;
  filterRead: string;
  activeFilterCount: number;
  onFilterTypeChange: (value: string) => void;
  onFilterReadChange: (value: string) => void;
  onClearFilters: () => void;
}

const NotificationsFilterPopover: React.FC<NotificationsFilterPopoverProps> = ({
  filterType,
  filterRead,
  activeFilterCount,
  onFilterTypeChange,
  onFilterReadChange,
  onClearFilters,
}) => {
  return (
    <FilterPopoverShell ariaSubject="notifications" activeFilterCount={activeFilterCount}>
      {({ close }) => (
        <>
          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger className="h-8 text-sm" aria-label="Filter by notification type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="work_order_submitted">Submitted</SelectItem>
                <SelectItem value="work_order_accepted">Accepted</SelectItem>
                <SelectItem value="work_order_assigned">Assigned</SelectItem>
                <SelectItem value="work_order_in_progress">In Progress</SelectItem>
                <SelectItem value="work_order_on_hold">On Hold</SelectItem>
                <SelectItem value="work_order_completed">Completed</SelectItem>
                <SelectItem value="work_order_cancelled">Cancelled</SelectItem>
                <SelectItem value="ownership_transfer_request">Transfer Request</SelectItem>
                <SelectItem value="ownership_transfer_accepted">Transfer Accepted</SelectItem>
                <SelectItem value="ownership_transfer_rejected">Transfer Declined</SelectItem>
                <SelectItem value="workspace_merge_request">Merge Request</SelectItem>
                <SelectItem value="workspace_merge_accepted">Merge Accepted</SelectItem>
                <SelectItem value="workspace_merge_rejected">Merge Declined</SelectItem>
                <SelectItem value="member_added">Member Added</SelectItem>
                <SelectItem value="member_role_changed">Org Role Changed</SelectItem>
                <SelectItem value="team_member_added">Team Member Added</SelectItem>
                <SelectItem value="team_member_role_changed">Team Role Changed</SelectItem>
                <SelectItem value="audit_export">Audit Export</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Read status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Read status</label>
            <Select value={filterRead} onValueChange={onFilterReadChange}>
              <SelectTrigger className="h-8 text-sm" aria-label="Filter by read status">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeFilterCount > 0 && (
            <>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onClearFilters();
                  close();
                }}
              >
                <X className="h-3 w-3 mr-1.5" />
                Clear all filters
              </Button>
            </>
          )}
        </>
      )}
    </FilterPopoverShell>
  );
};

export default NotificationsFilterPopover;
