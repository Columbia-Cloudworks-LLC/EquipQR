import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Download,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CalendarIcon,
  Table2,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTeams } from '@/features/teams/hooks/useTeams';
import type { WorkOrderExcelFilters } from '@/features/work-orders/types/workOrderExcel';
import { WORKSHEET_NAMES } from '@/features/work-orders/types/workOrderExcel';

interface WorkOrderExcelExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  recordCount: number;
  isLoadingCount?: boolean;
  onExport: (filters: WorkOrderExcelFilters) => Promise<void>;
  isExporting?: boolean;
  exportError?: string | null;
  /** Whether the organization has Google Workspace connected */
  isGoogleWorkspaceConnected?: boolean;
  /** Handler for exporting to Google Sheets (only called if isGoogleWorkspaceConnected) */
  onExportToSheets?: (filters: WorkOrderExcelFilters) => Promise<void>;
  /** Whether a Google Sheets export is in progress */
  isExportingToSheets?: boolean;
}

// Note: Using '_all' sentinel value because Radix Select doesn't allow empty strings
const ALL_VALUE = '_all';

const STATUS_OPTIONS = [
  { value: ALL_VALUE, label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: ALL_VALUE, label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const DATE_FIELD_OPTIONS = [
  { value: 'created_date', label: 'Created Date' },
  { value: 'completed_date', label: 'Completed Date' },
];

/**
 * WorkOrderExcelExportDialog - Modal for configuring work order Excel export
 * 
 * Features:
 * - Date field selector (Created/Completed)
 * - Date range picker
 * - Status filter
 * - Priority filter
 * - Team filter
 * - Shows record count
 * - Lists worksheets that will be included
 */
export const WorkOrderExcelExportDialog: React.FC<WorkOrderExcelExportDialogProps> = ({
  open,
  onOpenChange,
  organizationId,
  recordCount,
  isLoadingCount = false,
  onExport,
  isExporting = false,
  exportError = null,
  isGoogleWorkspaceConnected = false,
  onExportToSheets,
  isExportingToSheets = false,
}) => {
  // Filter state (using ALL_VALUE sentinel for "all" options)
  const [dateField, setDateField] = useState<'created_date' | 'completed_date'>('created_date');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<string>(ALL_VALUE);
  const [priority, setPriority] = useState<string>(ALL_VALUE);
  const [teamId, setTeamId] = useState<string>(ALL_VALUE);

  // Fetch teams for filter dropdown
  const { data: teams, isLoading: isLoadingTeams } = useTeams(organizationId);

  /** Build filters object from current state */
  const buildFilters = (): WorkOrderExcelFilters => ({
    dateField,
    status: status !== ALL_VALUE ? status : undefined,
    priority: priority !== ALL_VALUE ? priority : undefined,
    teamId: teamId !== ALL_VALUE ? teamId : undefined,
    dateRange: fromDate || toDate ? {
      from: fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined,
      to: toDate ? format(toDate, 'yyyy-MM-dd') : undefined,
    } : undefined,
  });

  const handleExport = async () => {
    await onExport(buildFilters());
  };

  const handleExportToSheets = async () => {
    if (!onExportToSheets) return;
    try {
      await onExportToSheets(buildFilters());
      onOpenChange(false);
    } catch {
      // Keep dialog open on error so user can retry.
      // Error toast is already handled by the export hook.
    }
  };

  const handleClearFilters = () => {
    setDateField('created_date');
    setFromDate(undefined);
    setToDate(undefined);
    setStatus(ALL_VALUE);
    setPriority(ALL_VALUE);
    setTeamId(ALL_VALUE);
  };

  const isAnyExporting = isExporting || isExportingToSheets;
  const canExport = recordCount > 0 && !isAnyExporting;

  // Build filter summary for display
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (status !== ALL_VALUE) parts.push(`Status: ${STATUS_OPTIONS.find(s => s.value === status)?.label}`);
    if (priority !== ALL_VALUE) parts.push(`Priority: ${PRIORITY_OPTIONS.find(p => p.value === priority)?.label}`);
    if (teamId !== ALL_VALUE && teams) {
      const team = teams.find(t => t.id === teamId);
      if (team) parts.push(`Team: ${team.name}`);
    }
    if (fromDate || toDate) {
      const from = fromDate ? format(fromDate, 'MMM d, yyyy') : 'Start';
      const to = toDate ? format(toDate, 'MMM d, yyyy') : 'Now';
      const fieldLabel = dateField === 'completed_date' ? 'Completed' : 'Created';
      parts.push(`${fieldLabel}: ${from} - ${to}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'No filters applied (all work orders)';
  }, [status, priority, teamId, teams, fromDate, toDate, dateField]);

  const worksheetList = Object.values(WORKSHEET_NAMES);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Work Orders (Detailed)
          </DialogTitle>
          <DialogDescription>
            Export work orders with all related data as a multi-worksheet Excel file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Worksheets Preview */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Table2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Worksheets Included</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {worksheetList.map((name) => (
                <Badge key={name} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Filters Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Filter Options</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 text-xs"
              >
                Clear Filters
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Date Field Selector */}
              <div className="space-y-2">
                <Label htmlFor="dateField">Date Filter Field</Label>
                <Select value={dateField} onValueChange={(v) => setDateField(v as 'created_date' | 'completed_date')}>
                  <SelectTrigger id="dateField">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FIELD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Filter */}
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Select value={teamId} onValueChange={setTeamId} disabled={isLoadingTeams}>
                  <SelectTrigger id="team">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All Teams</SelectItem>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* From Date */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !fromDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !toDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* Record Count Summary */}
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
                Excel Format
              </Badge>
            </div>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">{filterSummary}</p>
          </div>

          {/* Error Display */}
          {exportError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{exportError}</p>
            </div>
          )}

          {/* Row Limit Warning */}
          {recordCount > 5000 && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>
                Large dataset detected. Export will be limited to 5,000 work orders.
                Consider applying filters to reduce the dataset size.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAnyExporting}
          >
            Cancel
          </Button>
          
          {/* Google Sheets button - only shown when connected */}
          {isGoogleWorkspaceConnected && onExportToSheets && (
            <Button
              variant="outline"
              onClick={handleExportToSheets}
              disabled={!canExport}
              className="min-w-[180px]"
            >
              {isExportingToSheets ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Sheet...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Export to Google Sheets
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={handleExport}
            disabled={!canExport}
            className="min-w-[160px]"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderExcelExportDialog;
