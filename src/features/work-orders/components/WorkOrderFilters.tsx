import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Filter, Calendar, User, X, Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { WorkOrderFilters as FiltersType } from '@/features/work-orders/types/workOrder';

interface Team {
  id: string;
  name: string;
}

interface WorkOrderFiltersProps {
  filters: FiltersType;
  activeFilterCount: number;
  showMobileFilters: boolean;
  onShowMobileFiltersChange: (show: boolean) => void;
  onFilterChange: (key: keyof FiltersType, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: string) => void;
  teams?: Team[];
}

export const WorkOrderFilters: React.FC<WorkOrderFiltersProps> = ({
  filters,
  activeFilterCount,
  showMobileFilters,
  onShowMobileFiltersChange,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  teams = []
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="Search work orders..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { label: 'My Work', value: 'my-work' },
            { label: 'Urgent', value: 'urgent' },
            { label: 'Overdue', value: 'overdue' },
            { label: 'Unassigned', value: 'unassigned' }
          ].map((preset) => (
            <Button
              key={preset.value}
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
              onClick={() => {
                onQuickFilter(preset.value);
                onShowMobileFiltersChange(false);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Filter Button with Active Count */}
        <div className="flex gap-2">
          <Sheet open={showMobileFilters} onOpenChange={onShowMobileFiltersChange}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 h-12 justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh]">
              <SheetHeader className="pb-4">
                <SheetTitle>Filter Work Orders</SheetTitle>
              </SheetHeader>
              
              {/* Filters */}
              <div className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Filters</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select value={filters.statusFilter} onValueChange={(value) => onFilterChange('statusFilter', value)}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Assignee</label>
                      <Select value={filters.assigneeFilter} onValueChange={(value) => onFilterChange('assigneeFilter', value)}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="All Assignees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Assignees</SelectItem>
                          <SelectItem value="mine">My Work Orders</SelectItem>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Priority</label>
                      <Select value={filters.priorityFilter} onValueChange={(value) => onFilterChange('priorityFilter', value)}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="All Priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Due Date</label>
                      <Select value={filters.dueDateFilter} onValueChange={(value) => onFilterChange('dueDateFilter', value)}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="All Dates" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Dates</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="today">Due Today</SelectItem>
                          <SelectItem value="this_week">This Week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Team</label>
                      <Select value={filters.teamFilter} onValueChange={(value) => onFilterChange('teamFilter', value)}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="All Teams" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Teams</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Clear All Button */}
                  <Button
                    variant="outline"
                    onClick={onClearFilters}
                    className="w-full h-12"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active Filter Summary */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.statusFilter !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {filters.statusFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onFilterChange('statusFilter', 'all')}
                />
              </Badge>
            )}
            {filters.assigneeFilter !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Assignee: {filters.assigneeFilter === 'mine' ? 'Mine' : filters.assigneeFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onFilterChange('assigneeFilter', 'all')}
                />
              </Badge>
            )}
            {filters.priorityFilter !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Priority: {filters.priorityFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onFilterChange('priorityFilter', 'all')}
                />
              </Badge>
            )}
            {filters.dueDateFilter !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Due: {filters.dueDateFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onFilterChange('dueDateFilter', 'all')}
                />
              </Badge>
            )}
            {filters.teamFilter !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Team: {teams.find(t => t.id === filters.teamFilter)?.name || filters.teamFilter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onFilterChange('teamFilter', 'all')}
                />
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search work orders..."
                  value={filters.searchQuery}
                  onChange={(e) => onFilterChange('searchQuery', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filters.statusFilter} onValueChange={(value) => onFilterChange('statusFilter', value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'My Work', value: 'my-work' },
              { label: 'Urgent', value: 'urgent' },
              { label: 'Overdue', value: 'overdue' },
              { label: 'Unassigned', value: 'unassigned' }
            ].map((preset) => (
              <Button
                key={preset.value}
                size="sm"
                variant="outline"
                onClick={() => onQuickFilter(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Select value={filters.assigneeFilter} onValueChange={(value) => onFilterChange('assigneeFilter', value)}>
              <SelectTrigger>
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="mine">My Work Orders</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priorityFilter} onValueChange={(value) => onFilterChange('priorityFilter', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.dueDateFilter} onValueChange={(value) => onFilterChange('dueDateFilter', value)}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Due Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.teamFilter} onValueChange={(value) => onFilterChange('teamFilter', value)}>
              <SelectTrigger>
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={onClearFilters}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


