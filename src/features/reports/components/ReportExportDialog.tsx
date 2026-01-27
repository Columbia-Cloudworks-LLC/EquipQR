import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Download, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { ColumnSelector } from './ColumnSelector';
import {
  getSavedColumnPreferences,
  saveColumnPreferences,
  clearColumnPreferences,
} from '@/features/reports/utils/column-preferences';
import { getColumnsForReportType, getDefaultColumns } from '@/features/reports/constants/reportColumns';
import type { ReportType, ExportFilters } from '@/features/reports/types/reports';

interface ReportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: ReportType;
  reportTitle: string;
  filters: ExportFilters;
  recordCount: number;
  isLoadingCount?: boolean;
  onExport: (columns: string[]) => Promise<void>;
  isExporting?: boolean;
  exportError?: string | null;
}

/**
 * ReportExportDialog - Modal for configuring and triggering report exports
 * 
 * Features:
 * - Shows record count based on current filters
 * - Allows column selection via ColumnSelector
 * - Export button with loading state
 * - Error handling display
 */
export const ReportExportDialog: React.FC<ReportExportDialogProps> = ({
  open,
  onOpenChange,
  reportType,
  reportTitle,
  filters,
  recordCount,
  isLoadingCount = false,
  onExport,
  isExporting = false,
  exportError = null,
}) => {
  const availableColumns = useMemo(
    () => getColumnsForReportType(reportType),
    [reportType]
  );

  // Check if there are saved preferences
  const [hasSavedPreferences, setHasSavedPreferences] = useState(false);

  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    const saved = getSavedColumnPreferences(reportType);
    if (saved) {
      // Filter to only include columns that still exist
      const validColumns = saved.filter(col => 
        getColumnsForReportType(reportType).some(c => c.key === col)
      );
      if (validColumns.length > 0) {
        return validColumns;
      }
    }
    return getDefaultColumns(reportType);
  });

  // Reset selected columns when report type changes, checking for saved preferences
  useEffect(() => {
    const saved = getSavedColumnPreferences(reportType);
    if (saved) {
      // Filter to only include columns that still exist
      const availableCols = getColumnsForReportType(reportType);
      const validColumns = saved.filter(col => 
        availableCols.some(c => c.key === col)
      );
      if (validColumns.length > 0) {
        setSelectedColumns(validColumns);
        setHasSavedPreferences(true);
        return;
      }
    }
    setSelectedColumns(getDefaultColumns(reportType));
    setHasSavedPreferences(false);
  }, [reportType]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) return;
    // Save the column preferences before exporting
    saveColumnPreferences(reportType, selectedColumns);
    setHasSavedPreferences(true);
    await onExport(selectedColumns);
  };

  const handleResetToDefaults = useCallback(() => {
    clearColumnPreferences(reportType);
    setSelectedColumns(getDefaultColumns(reportType));
    setHasSavedPreferences(false);
  }, [reportType]);

  const canExport = selectedColumns.length > 0 && recordCount > 0 && !isExporting;

  // Build filter summary for display
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.status) parts.push(`Status: ${filters.status}`);
    if (filters.teamId) parts.push(`Team filtered`);
    if (filters.location) parts.push(`Location: ${filters.location}`);
    if (filters.priority) parts.push(`Priority: ${filters.priority}`);
    if (filters.dateRange?.from || filters.dateRange?.to) {
      const from = filters.dateRange.from || 'Start';
      const to = filters.dateRange.to || 'Now';
      parts.push(`Date: ${from} to ${to}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'No filters applied';
  }, [filters]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export {reportTitle}
          </DialogTitle>
          <DialogDescription>
            Configure the columns to include in your CSV export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Record Count and Filters Summary */}
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
                CSV Format
              </Badge>
            </div>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">{filterSummary}</p>
          </div>

          {/* Column Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Select Columns to Include</h4>
            <ColumnSelector
              availableColumns={availableColumns}
              selectedColumns={selectedColumns}
              onChange={setSelectedColumns}
              onResetToDefaults={handleResetToDefaults}
              hasSavedPreferences={hasSavedPreferences}
            />
          </div>

          {/* Error Display */}
          {exportError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{exportError}</p>
            </div>
          )}

          {/* Row Limit Warning */}
          {recordCount > 50000 && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>
                Large dataset detected. Export will be limited to 50,000 records.
                Consider applying filters to reduce the dataset size.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport}
            className="min-w-[140px]"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {recordCount > 0 ? recordCount.toLocaleString() : ''} Records
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportExportDialog;
