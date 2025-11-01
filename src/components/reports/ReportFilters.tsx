
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ReportFilters as ReportFiltersType, ReportType } from '@/pages/Reports';
import { Equipment, WorkOrder } from '@/services/supabaseDataService';

interface ReportFiltersProps {
  filters: ReportFiltersType;
  onFiltersChange: (filters: ReportFiltersType) => void;
  equipment: Equipment[];
  workOrders: WorkOrder[];
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  equipment,
  workOrders
}) => {
  const updateFilters = (updates: Partial<ReportFiltersType>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const uniqueStatuses = filters.type === 'equipment' 
    ? [...new Set(equipment.map(e => e.status))]
    : [...new Set(workOrders.map(w => w.status))];

  const uniquePriorities = [...new Set(workOrders.map(w => w.priority))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </CardTitle>
        <CardDescription>
          Configure your report parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Report Type</Label>
          <Select 
            value={filters.type} 
            onValueChange={(value: ReportType) => updateFilters({ type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="workorders">Work Orders</SelectItem>
              <SelectItem value="maintenance">Maintenance History</SelectItem>
              <SelectItem value="kpis">KPIs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from ? format(filters.dateRange.from, "PPP") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.from}
                  onSelect={(date) => updateFilters({ 
                    dateRange: { ...filters.dateRange, from: date } 
                  })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.to ? format(filters.dateRange.to, "PPP") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.to}
                  onSelect={(date) => updateFilters({ 
                    dateRange: { ...filters.dateRange, to: date } 
                  })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select 
            value={filters.status || 'all_statuses'} 
            onValueChange={(value) => updateFilters({ status: value === 'all_statuses' ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_statuses">All statuses</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filters.type === 'equipment' && (
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="Filter by location..."
              value={filters.location || ''}
              onChange={(e) => updateFilters({ location: e.target.value || undefined })}
            />
          </div>
        )}

        {filters.type === 'workorders' && (
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select 
              value={filters.priority || 'all_priorities'} 
              onValueChange={(value) => updateFilters({ priority: value === 'all_priorities' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_priorities">All priorities</SelectItem>
                {uniquePriorities.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportFilters;
