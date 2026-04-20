import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AuditLogFilterPopover from './AuditLogFilterPopover';
import AuditLogDownloadMenu from './AuditLogDownloadMenu';
import { AuditLogTimeRangePicker } from './explorer/AuditLogTimeRangePicker';
import {
  AuditLogFilters,
  AuditLogTimePreset,
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
} from '@/types/audit';

interface AuditLogToolbarProps {
  filters: AuditLogFilters;
  onFilterChange: (filters: AuditLogFilters) => void;
  onClear: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  isExporting: boolean;
  exportProgressLabel?: string;
  canExport: boolean;
  resultCount: number;
  /** Active time-range preset; rendered by the embedded AuditLogTimeRangePicker. */
  timePreset: AuditLogTimePreset;
  /** ISO timestamp of the active range start (only used when preset === 'custom'). */
  timeFromIso?: string;
  /** ISO timestamp of the active range end (only used when preset === 'custom'). */
  timeToIso?: string;
  onTimeRangeChange: (
    preset: AuditLogTimePreset,
    isoFrom?: string,
    isoTo?: string
  ) => void;
}

const PRESET_LABELS: Record<AuditLogTimePreset, string> = {
  last_15m: 'Last 15m',
  last_1h: 'Last 1h',
  last_24h: 'Last 24h',
  last_7d: 'Last 7d',
  last_30d: 'Last 30d',
  custom: 'Custom',
};

const AuditLogToolbar: React.FC<AuditLogToolbarProps> = ({
  filters,
  onFilterChange,
  onClear,
  onExportCsv,
  onExportJson,
  isExporting,
  exportProgressLabel,
  canExport,
  resultCount,
  timePreset,
  timeFromIso,
  timeToIso,
  onTimeRangeChange,
}) => {
  const activeFilterCount = [
    !!filters.entityType && filters.entityType !== 'all',
    !!filters.action && filters.action !== 'all',
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || !!filters.search || timePreset !== 'last_24h';

  return (
    <div className="flex flex-col gap-2">
      {/* Single toolbar row */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-[280px] min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="audit-log-search"
            placeholder="Search by name or user..."
            value={filters.search ?? ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value || undefined })}
            className="h-8 pl-8 text-sm bg-transparent"
            aria-label="Search audit entries by entity name or user"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ ...filters, search: undefined })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Time range picker */}
        <AuditLogTimeRangePicker
          preset={timePreset}
          isoFrom={timeFromIso}
          isoTo={timeToIso}
          onChange={onTimeRangeChange}
        />

        <Separator orientation="vertical" className="h-5" />

        {/* Filter popover */}
        <AuditLogFilterPopover
          filters={filters}
          activeFilterCount={activeFilterCount}
          onFilterChange={onFilterChange}
          onClear={onClear}
        />

        <Separator orientation="vertical" className="h-5" />

        {/* Download menu */}
        <AuditLogDownloadMenu
          onExportCsv={onExportCsv}
          onExportJson={onExportJson}
          isExporting={isExporting}
          exportProgressLabel={exportProgressLabel}
          canExport={canExport}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Result count */}
        <span
          className="text-xs text-muted-foreground whitespace-nowrap hidden lg:block"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="font-medium text-foreground">{resultCount.toLocaleString()}</span>
          {' entries'}
        </span>
      </div>

      {/* Active filter badges row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground">Active:</span>

          {timePreset !== 'last_24h' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {`Time: ${PRESET_LABELS[timePreset]}`}
              <button
                onClick={() => onTimeRangeChange('last_24h')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Reset time range to last 24h"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.entityType && filters.entityType !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {ENTITY_TYPE_LABELS[filters.entityType] ?? filters.entityType}
              <button
                onClick={() => onFilterChange({ ...filters, entityType: undefined })}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear entity type filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.action && filters.action !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {ACTION_LABELS[filters.action] ?? filters.action}
              <button
                onClick={() => onFilterChange({ ...filters, action: undefined })}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear action filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClear}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuditLogToolbar;
