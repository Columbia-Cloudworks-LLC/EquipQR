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
import {
  AuditLogFilters,
  AuditEntityType,
  AuditAction,
  AUDIT_ENTITY_TYPES,
  AUDIT_ACTIONS,
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
} from '@/types/audit';

interface AuditLogFilterPopoverProps {
  filters: AuditLogFilters;
  activeFilterCount: number;
  onFilterChange: (filters: AuditLogFilters) => void;
  onClear: () => void;
}

const AuditLogFilterPopover: React.FC<AuditLogFilterPopoverProps> = ({
  filters,
  activeFilterCount,
  onFilterChange,
  onClear,
}) => {
  return (
    <FilterPopoverShell ariaSubject="audit log" activeFilterCount={activeFilterCount}>
      {({ close }) => (
        <>
          {/* Entity Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Entity Type</label>
            <Select
              value={filters.entityType ?? 'all'}
              onValueChange={(v) =>
                onFilterChange({
                  ...filters,
                  entityType: v === 'all' ? undefined : (v as AuditEntityType),
                })
              }
            >
              <SelectTrigger className="h-8 text-sm" aria-label="Filter by entity type">
                <SelectValue placeholder="All types" />
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
          </div>

          {/* Action */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Action</label>
            <Select
              value={filters.action ?? 'all'}
              onValueChange={(v) =>
                onFilterChange({
                  ...filters,
                  action: v === 'all' ? undefined : (v as AuditAction),
                })
              }
            >
              <SelectTrigger className="h-8 text-sm" aria-label="Filter by action">
                <SelectValue placeholder="All actions" />
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
          </div>

          {activeFilterCount > 0 && (
            <>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onClear();
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

export default AuditLogFilterPopover;
